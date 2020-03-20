import { Component } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ActivatedRoute, Router } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapMainDelegatorAction,
  AirGapExtraDelegatorAction
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { OperationsProvider } from 'src/app/services/operations/operations'
import { supportsDelegation, supportsAirGapDelegation } from 'src/app/helpers/delegation'
import { FormGroup, FormBuilder } from '@angular/forms'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { LoadingController } from '@ionic/angular'
import { UIAccount } from 'src/app/models/widgets/UIAccount'
import { UIIconText } from 'src/app/models/widgets/UIIconText'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'

@Component({
  selector: 'app-delegation-detail',
  templateUrl: './delegation-detail.html',
  styleUrls: ['./delegation-detail.scss']
})
export class DelegationDetailPage {
  public delegateActionId: string = 'delegate'
  public delegateButton: string = 'Delegate'

  public undelegateActionId: string = 'undelegate'
  public undelegateButton: string = 'Undelegate'

  public wallet: AirGapMarketWallet

  public delegationForms: Map<any, FormGroup> = new Map()

  public delegateeLabel: string
  public delegateeAccountWidget: UIAccount

  public delegatorBalanceWidget: UIIconText

  public activeDelegatorAction: string | null = null
  public activeDelegatorActionConfirmButton: string | null = null

  public delegateeDetails$: BehaviorSubject<AirGapDelegateeDetails> = new BehaviorSubject(null)
  public delegatorDetails$: BehaviorSubject<AirGapDelegatorDetails> = new BehaviorSubject(null)

  private readonly delegateeAddresses$: BehaviorSubject<string[]> = new BehaviorSubject([])

  private loader: HTMLIonLoadingElement | undefined
  constructor(
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly operations: OperationsProvider,
    private readonly loadingController: LoadingController,
    private readonly route: ActivatedRoute,
    private readonly formBuilder: FormBuilder,
    private readonly amountConverter: AmountConverterPipe
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
    }

    this.delegateeLabel = supportsAirGapDelegation(this.wallet.coinProtocol) ? this.wallet.coinProtocol.delegateeLabel : 'Delegation'

    if (supportsDelegation(this.wallet.coinProtocol)) {
      this.subscribeObservables()

      this.operations
        .getCurrentDelegatees(this.wallet.coinProtocol, this.wallet.receivingPublicAddress)
        .then(addresses => this.delegateeAddresses$.next(addresses))

      this.operations
        .getDelegatorDetails(this.wallet.coinProtocol, this.wallet.receivingPublicAddress)
        .then(details => this.delegatorDetails$.next(details))
    }
  }

  public async presentEditPopover(event: Event): Promise<void> {
    console.log(event)
    // TODO: select new delegatee
  }

  public async callAction(): Promise<void> {
    this.loader = await this.loadingController.create({
      message: 'Preparing transaction...'
    })

    await this.loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))

    try {
      const delegatorDetails = this.delegatorDetails$.value
      if (!delegatorDetails) {
        return
      }

      let actionType: any
      switch (this.activeDelegatorAction) {
        case this.delegateActionId:
          actionType = delegatorDetails.delegateAction.type
          break
        case this.undelegateActionId:
          actionType = delegatorDetails.undelegateAction.type
          break
        default:
          actionType = delegatorDetails.extraActions.find(action => action.type.toString() === this.activeDelegatorAction).type
      }

      const data = this.delegationForms[actionType].value
      const { airGapTxs, serializedTxChunks } = await this.operations.prepareDelegatorAction(this.wallet, actionType, data)

      const info = {
        wallet: this.wallet,
        airGapTxs,
        data: serializedTxChunks
      }

      this.dismissLoader()

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      this.dismissLoader()
      console.log(error)
    }
  }

  public onActiveActionChange() {
    switch (this.activeDelegatorAction) {
      case this.delegateActionId:
        this.activeDelegatorActionConfirmButton = this.delegateButton
        break
      case this.undelegateActionId:
        this.activeDelegatorActionConfirmButton = this.undelegateButton
        break
      default:
        const activeAction = this.delegatorDetails$.value.extraActions
          ? this.delegatorDetails$.value.extraActions.find(action => action.type.toString() === this.activeDelegatorAction)
          : null

        this.activeDelegatorActionConfirmButton = activeAction.confirmLabel
    }
  }

  private subscribeObservables() {
    this.delegateeAddresses$.subscribe(addresses => {
      if (addresses && supportsDelegation(this.wallet.coinProtocol)) {
        // TODO: support multiple cases
        this.operations.getDelegateeDetails(this.wallet.coinProtocol, addresses).then(details => this.delegateeDetails$.next(details[0]))

        const details = this.delegatorDetails$.value
        if (details) {
          this.setupMainActionsForms(details)
        }
      }
    })

    this.delegateeDetails$.subscribe(details => {
      if (details) {
        this.delegateeAccountWidget = new UIAccount({
          name: details.name,
          address: details.address
        })
      }
    })

    this.delegatorDetails$.subscribe(details => {
      if (details) {
        // TODO: add translations
        this.delegatorBalanceWidget = new UIIconText({
          iconName: 'wallet',
          text: this.amountConverter.transform(details.balance, {
            protocolIdentifier: this.wallet.protocolIdentifier,
            maxDigits: 10
          }),
          description: 'Your Balance'
        })

        this.setupForms(details)
        this.setActiveDelegatorAction(details)
      }
    })
  }

  private setupForms(details: AirGapDelegatorDetails) {
    this.setupMainActionsForms(details)
    this.setupExtraActionsForms(details)
  }

  private setupMainActionsForms(details: AirGapDelegatorDetails) {
    const mainActions: AirGapMainDelegatorAction[] = [details.delegateAction, details.undelegateAction]

    mainActions.forEach(action => {
      if (action && action.type !== undefined && action.isAvailable && (action.paramName || action.extraArgs)) {
        const form = this.delegationForms[action.type]
        const args = {}
        if (action.paramName) {
          args[action.paramName] = this.delegateeAddresses$.value
        }
        if (action.extraArgs) {
          action.extraArgs.forEach(arg => {
            args[arg.id] = form ? form.value[arg.id] : null
            args[arg.controlName] = form ? form.value[arg.controlName] : null
          })
        }

        if (form) {
          form.setValue(args)
        } else {
          this.delegationForms[action.type] = this.formBuilder.group(args)
        }
      }
    })
  }

  private setupExtraActionsForms(details: AirGapDelegatorDetails) {
    const extraActions: AirGapExtraDelegatorAction[] = details.extraActions

    extraActions.forEach(action => {
      if (action.args) {
        const form = this.delegationForms[action.type]
        const args = {}
        action.args.forEach(arg => {
          args[arg.id] = form ? form.value[arg.id] : null
          args[arg.controlName] = form ? form.value[arg.controlName] : null
        })

        if (form) {
          form.setValue(args)
        } else {
          this.delegationForms[action.type] = this.formBuilder.group(args)
        }
      }
    })
  }

  private setActiveDelegatorAction(details: AirGapDelegatorDetails) {
    if (details.delegateAction.isAvailable) {
      this.activeDelegatorAction = this.delegateActionId
      this.activeDelegatorActionConfirmButton = this.delegateButton
    } else if (details.undelegateAction.isAvailable) {
      this.activeDelegatorAction = this.undelegateActionId
      this.activeDelegatorActionConfirmButton = this.undelegateButton
    } else {
      const activeAction = details.extraActions ? details.extraActions[0] : null

      this.activeDelegatorAction = activeAction ? activeAction.type : null
      this.activeDelegatorActionConfirmButton = activeAction ? activeAction.confirmLabel : null
    }
  }

  private dismissLoader() {
    if (this.loader) {
      this.loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
    }
  }
}
