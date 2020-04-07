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
import { supportsAirGapDelegation, supportsDelegation } from 'src/app/helpers/delegation'
import { FormGroup, FormBuilder, FormControl } from '@angular/forms'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { LoadingController, PopoverController, NavController } from '@ionic/angular'
import { UIAccount } from 'src/app/models/widgets/display/UIAccount'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import { ExtensionsService } from 'src/app/services/extensions/extensions.service'
import { OverlayEventDetail } from '@ionic/angular/node_modules/@ionic/core'
import { DelegateEditPopoverComponent } from 'src/app/components/delegate-edit-popover/delegate-edit-popover.component'
import { UIInputWidget } from 'src/app/models/widgets/UIInputWidget'
import { UIWidget } from 'src/app/models/widgets/UIWidget'

@Component({
  selector: 'app-delegation-detail',
  templateUrl: './delegation-detail.html',
  styleUrls: ['./delegation-detail.scss']
})
export class DelegationDetailPage {
  public delegateActionId: string
  public delegateButton: string = 'Delegate'

  public undelegateActionId: string
  public undelegateButton: string = 'Undelegate'

  public wallet: AirGapMarketWallet

  public delegationForms: Map<string, FormGroup> = new Map()

  public delegateeLabel: string
  public delegateeAccountWidget: UIAccount

  public delegatorBalanceWidget: UIIconText

  public activeDelegatorAction: string | null = null
  public activeDelegatorActionConfirmButton: string | null = null

  public delegateeDetails$: BehaviorSubject<AirGapDelegateeDetails> = new BehaviorSubject(null)
  public delegatorDetails$: BehaviorSubject<AirGapDelegatorDetails> = new BehaviorSubject(null)

  public canProceed: boolean = true

  private readonly delegateeAddresses$: BehaviorSubject<string[]> = new BehaviorSubject([])

  private loader: HTMLIonLoadingElement | undefined
  constructor(
    private readonly router: Router,
    private readonly navController: NavController,
    private readonly dataService: DataService,
    private readonly operations: OperationsProvider,
    private readonly extensionsService: ExtensionsService,
    private readonly loadingController: LoadingController,
    private readonly popoverController: PopoverController,
    private readonly route: ActivatedRoute,
    private readonly formBuilder: FormBuilder,
    private readonly amountConverter: AmountConverterPipe
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
    }

    this.extensionsService.loadDelegationExtensions().then(() => this.initView())
  }

  public filterVisible(widgets?: UIWidget[]): UIWidget[] {
    return widgets ? widgets.filter(widget => widget.isVisible) : []
  }

  public async presentEditPopover(event: Event): Promise<void> {
    const popover: HTMLIonPopoverElement = await this.popoverController.create({
      component: DelegateEditPopoverComponent,
      componentProps: {
        hideAirGap: supportsAirGapDelegation(this.wallet.coinProtocol)
          ? !this.wallet.coinProtocol.airGapDelegatee || this.delegateeAddresses$.value.includes(this.wallet.coinProtocol.airGapDelegatee)
          : true,
        delegateeLabel: this.delegateeLabel
      },
      event,
      translucent: true
    })

    function isDelegateeAddressObject(value: unknown): value is { delegateeAddress: string } {
      return value instanceof Object && 'delegateeAddress' in value
    }

    function isChangeToAirGapObject(value: unknown): value is { changeToAirGap: boolean } {
      return value instanceof Object && 'changeToAirGap' in value
    }

    popover
      .onDidDismiss()
      .then(async ({ data }: OverlayEventDetail<unknown>) => {
        if (isDelegateeAddressObject(data)) {
          this.changeDelegatees([data.delegateeAddress]) // TODO: support multiple entries
        } else if (isChangeToAirGapObject(data) && supportsAirGapDelegation(this.wallet.coinProtocol)) {
          this.changeDelegatees([this.wallet.coinProtocol.airGapDelegatee])
        } else {
          console.log('Did not receive valid delegatee address object')
        }
      })
      .catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))

    return popover.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async callAction(): Promise<void> {
    if (this.activeDelegatorAction === undefined || this.activeDelegatorAction === null) {
      this.navController.back()
      return
    }

    const delegatorDetails = this.delegatorDetails$.value
    if (!delegatorDetails) {
      return
    }

    let actionType: any
    switch (this.activeDelegatorAction) {
      case this.delegateActionId.toString():
        actionType = delegatorDetails.delegateAction.type
        break
      case this.undelegateActionId.toString():
        actionType = delegatorDetails.undelegateAction.type
        break
      default:
        actionType = delegatorDetails.extraActions.find(action => action.type.toString() === this.activeDelegatorAction).type
    }

    this.prepareDelegationAction(actionType)
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

  private initView() {
    this.delegateeLabel = supportsAirGapDelegation(this.wallet.coinProtocol) ? this.wallet.coinProtocol.delegateeLabel : 'Delegation'

    this.subscribeObservables()

    this.operations.getCurrentDelegatees(this.wallet).then(addresses => this.delegateeAddresses$.next(addresses))

    this.operations.getDelegatorDetails(this.wallet).then(details => this.delegatorDetails$.next(details))
  }

  private subscribeObservables() {
    this.delegateeAddresses$.subscribe(addresses => {
      if (addresses) {
        // TODO: support multiple cases
        this.operations.getDelegateeDetails(this.wallet, addresses).then(details => this.delegateeDetails$.next(details[0]))

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

        this.operations.onDelegationDetailsChange(this.wallet, [details], this.delegatorDetails$.value)
      }
    })

    this.delegatorDetails$.subscribe(async details => {
      if (details) {
        // TODO: add translations
        this.delegatorBalanceWidget = new UIIconText({
          iconName: 'wallet',
          text: this.amountConverter.transform(details.balance, {
            protocolIdentifier: this.wallet.protocolIdentifier,
            maxDigits: 10
          }),
          description: 'Your balance'
        })

        this.setupForms(details)
        this.delegateActionId = details.delegateAction.type ? details.delegateAction.type.toString() : 'delegate'
        this.undelegateActionId = details.undelegateAction.type ? details.undelegateAction.type.toString() : 'undelegate'
        this.setActiveDelegatorAction(details)

        this.operations.onDelegationDetailsChange(this.wallet, [this.delegateeDetails$.value], details)
      }
    })
  }

  private setupForms(details: AirGapDelegatorDetails) {
    this.setupMainActionsForms(details)
    this.setupExtraActionsForms(details)

    Array.from(this.delegationForms.entries()).forEach(([type, formGroup]) => {
      formGroup.valueChanges.subscribe(() => {
        if (this.activeDelegatorAction === type.toString()) {
          this.canProceed = formGroup.valid
        }
      })
    })
  }

  private setupMainActionsForms(details: AirGapDelegatorDetails) {
    const mainActions: AirGapMainDelegatorAction[] = [details.delegateAction, details.undelegateAction, details.changeDelegateeAction]

    mainActions
      .filter(action => action && action.type !== undefined && action.isAvailable && (action.paramName || action.extraArgs || action.form))
      .forEach(action => {
        if (action.form) {
          this.delegationForms.set(action.type, action.form)
        } else {
          const form = this.delegationForms.get(action.type)
          const args = this.setupArgsForms(action.extraArgs || [], form)

          if (form) {
            form.setValue(args)
          } else {
            this.delegationForms.set(action.type, this.formBuilder.group(args))
          }

          action.form = this.delegationForms.get(action.type)
        }

        const form = this.delegationForms.get(action.type)
        if (action.paramName && !form.get(action.paramName)) {
          const supportsMultipleDelegatees =
            supportsDelegation(this.wallet.coinProtocol) && this.wallet.coinProtocol.supportsMultipleDelegatees

          this.delegationForms
            .get(action.type)
            .addControl(
              action.paramName,
              new FormControl(supportsMultipleDelegatees ? this.delegateeAddresses$.value : this.delegateeAddresses$.value[0])
            )
        }

        if (action.extraArgs) {
          action.extraArgs.forEach(arg => {
            arg.wallet = this.wallet
          })
        }
      })
  }

  private setupExtraActionsForms(details: AirGapDelegatorDetails) {
    const extraActions: AirGapExtraDelegatorAction[] = details.extraActions

    if (extraActions) {
      extraActions.forEach(action => {
        if (action.form) {
          this.delegationForms.set(action.type, action.form)
        } else if (action.args) {
          const form = this.delegationForms.get(action.type)
          const args = this.setupArgsForms(action.args || [], form)

          if (form) {
            form.setValue(args)
          } else {
            this.delegationForms.set(action.type, this.formBuilder.group(args))
          }

          action.form = this.delegationForms.get(action.type)
        }

        if (action.args) {
          action.args.forEach(arg => {
            arg.wallet = this.wallet
          })
        }
      })
    }
  }

  private setupArgsForms(args: UIInputWidget<any>[], form: FormGroup): any {
    const formArgs = {}

    args.forEach(arg => {
      formArgs[arg.id] = form ? form.value[arg.id] : null
    })

    return formArgs
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

      this.activeDelegatorAction = activeAction && activeAction ? activeAction.type.toString() : null
      this.activeDelegatorActionConfirmButton = activeAction ? activeAction.confirmLabel : null
    }
  }

  private changeDelegatees(addresses: string[]) {
    const delegatorDetails = this.delegatorDetails$.value
    if (!delegatorDetails.isDelegating) {
      this.delegateeAddresses$.next(addresses)
    } else if (delegatorDetails.changeDelegateeAction.isAvailable) {
      const action = delegatorDetails.changeDelegateeAction
      if (action.paramName) {
        this.delegationForms[action.type].patchValue({
          [action.paramName]: addresses
        })
      }
      this.prepareDelegationAction(action.type)
    } else {
      // TODO: show error
    }
  }

  private async prepareDelegationAction(actionType: any): Promise<void> {
    this.loader = await this.loadingController.create({
      message: 'Preparing transaction...'
    })

    await this.loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))

    try {
      const form = this.delegationForms.get(actionType)
      const data = form ? form.value : undefined
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
      console.warn(error)
      // TODO: show error prompt
    }
  }

  private dismissLoader() {
    if (this.loader) {
      this.loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
    }
  }
}
