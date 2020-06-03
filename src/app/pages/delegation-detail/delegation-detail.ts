import { Component } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ActivatedRoute, Router } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapDelegatorAction,
  AirGapDelegationDetails,
  AirGapRewardDisplayDetails
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { OperationsProvider } from 'src/app/services/operations/operations'
import { supportsAirGapDelegation } from 'src/app/helpers/delegation'
import { FormGroup, FormBuilder } from '@angular/forms'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { LoadingController, PopoverController, NavController, ToastController } from '@ionic/angular'
import { UIAccount } from 'src/app/models/widgets/display/UIAccount'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import { ExtensionsService } from 'src/app/services/extensions/extensions.service'
import { OverlayEventDetail } from '@ionic/angular/node_modules/@ionic/core'
import { DelegateEditPopoverComponent } from 'src/app/components/delegate-edit-popover/delegate-edit-popover.component'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { isType } from 'src/app/utils/utils'

@Component({
  selector: 'app-delegation-detail',
  templateUrl: './delegation-detail.html',
  styleUrls: ['./delegation-detail.scss']
})
export class DelegationDetailPage {
  public wallet: AirGapMarketWallet

  public delegationForms: Map<string, FormGroup> = new Map()

  public delegateeLabel: string
  public delegateeLabelPlural: string
  public delegateeAccountWidget: UIAccount

  public delegatorBalanceWidget: UIIconText

  public activeDelegatorAction: string | null = null
  public activeDelegatorActionConfirmButton: string | null = null

  public delegateeDetails$: BehaviorSubject<AirGapDelegateeDetails | null> = new BehaviorSubject(null)
  public delegatorDetails$: BehaviorSubject<AirGapDelegatorDetails | null> = new BehaviorSubject(null)
  public rewardDisplay$: BehaviorSubject<AirGapRewardDisplayDetails | null> = new BehaviorSubject(null)

  public canProceed: boolean = true
  public hasRewardDetails: boolean | undefined = undefined

  public get shouldDisplaySegmentButtons(): boolean {
    const details = this.delegatorDetails$.value

    return details.mainActions && details.mainActions.some(action => !!action.description || !!action.args)
  }

  private readonly delegateeAddress$: BehaviorSubject<string | null> = new BehaviorSubject(null)
  private currentDelegatees: string[] = []

  private loader: HTMLIonLoadingElement | undefined

  constructor(
    private readonly router: Router,
    private readonly navController: NavController,
    private readonly dataService: DataService,
    private readonly operations: OperationsProvider,
    private readonly extensionsService: ExtensionsService,
    private readonly loadingController: LoadingController,
    private readonly popoverController: PopoverController,
    private readonly toastController: ToastController,
    private readonly route: ActivatedRoute,
    private readonly formBuilder: FormBuilder,
    private readonly amountConverter: AmountConverterPipe
  ) {}

  ngOnInit() {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
    }

    this.extensionsService.loadDelegationExtensions().then(() => {
      this.initView()
    })
  }

  public filterVisible(widgets?: UIWidget[]): UIWidget[] {
    return widgets ? widgets.filter(widget => widget.isVisible) : []
  }

  public async presentEditPopover(event: Event): Promise<void> {
    const delegatorDetails = this.delegatorDetails$.value
    const secondaryActions = delegatorDetails ? delegatorDetails.secondaryActions : undefined

    const popover: HTMLIonPopoverElement = await this.popoverController.create({
      component: DelegateEditPopoverComponent,
      componentProps: {
        hideAirGap: supportsAirGapDelegation(this.wallet.coinProtocol)
          ? !this.wallet.coinProtocol.airGapDelegatee || this.currentDelegatees.includes(this.wallet.coinProtocol.airGapDelegatee)
          : true,
        delegateeLabel: this.delegateeLabel,
        delegateeLabelPlural: this.delegateeLabelPlural,
        hasMultipleDelegatees: this.currentDelegatees.length > 1,
        secondaryDelegatorActions: secondaryActions
      },
      event,
      translucent: true
    })

    popover
      .onDidDismiss()
      .then(async ({ data }: OverlayEventDetail<unknown>) => {
        if (isType<{ delegateeAddress: string }>(data, 'delegateeAddress')) {
          this.changeDisplayedDetails(data.delegateeAddress)
        } else if (isType<{ changeToAirGap: boolean }>(data, 'changeToAirGap') && supportsAirGapDelegation(this.wallet.coinProtocol)) {
          this.changeDisplayedDetails(this.wallet.coinProtocol.airGapDelegatee)
        } else if (isType<{ showDelegateeList: boolean }>(data, 'showDelegateeList')) {
          this.showDelegateesList()
        } else if (isType<{ secondaryActionType: string }>(data, 'secondaryActionType')) {
          this.callSecondaryAction(data.secondaryActionType)
        } else {
          console.log('Unknown option selected.')
        }
      })
      .catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))

    return popover.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public callMainAction(type: string) {
    const delegatorDetails = this.delegatorDetails$.value
    if (!delegatorDetails) {
      return
    }

    if (!delegatorDetails.mainActions || delegatorDetails.mainActions.length === 0) {
      this.navController.back()
      return
    }

    this.callAction(delegatorDetails.mainActions, type)
  }

  public callSecondaryAction(type: string) {
    const delegatorDetails = this.delegatorDetails$.value
    if (!delegatorDetails) {
      return
    }

    this.callAction(delegatorDetails.secondaryActions || [], type)
  }

  public onActiveActionChange(activeDelegatorAction: string | null) {
    const activeAction = this.delegatorDetails$.value.mainActions
      ? this.delegatorDetails$.value.mainActions.find(action => action.type.toString() === activeDelegatorAction)
      : null

    this.activeDelegatorAction = activeDelegatorAction
    this.activeDelegatorActionConfirmButton = activeAction ? activeAction.confirmLabel || activeAction.label : null
  }

  public showDelegateesList() {
    const info = {
      wallet: this.wallet,
      delegateeLabelPlural: this.delegateeLabelPlural,
      currentDelegatees: this.currentDelegatees,
      callback: (address: string) => {
        this.changeDisplayedDetails(address)
      }
    }

    this.dataService.setData(DataServiceKey.DETAIL, info)
    this.router
      .navigateByUrl('/delegation-list/' + DataServiceKey.DETAIL, { skipLocationChange: true })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private initView() {
    this.delegateeLabel = supportsAirGapDelegation(this.wallet.coinProtocol)
      ? this.wallet.coinProtocol.delegateeLabel
      : 'delegation-detail.default-delegatee-label'

    this.delegateeLabelPlural = supportsAirGapDelegation(this.wallet.coinProtocol)
      ? this.wallet.coinProtocol.delegateeLabelPlural
      : 'delegation-detail.defailt-delegatee-label-plural'

    this.subscribeObservables()

    this.operations.getCurrentDelegatees(this.wallet).then(addresses => {
      if (addresses) {
        this.currentDelegatees = addresses
        this.delegateeAddress$.next(addresses[0])
      }
    })
  }

  private subscribeObservables() {
    this.delegateeAddress$.subscribe(async address => {
      if (address) {
        this.updateDisplayedDetails(null)
        this.updateDisplayedRewards(null)

        this.operations.getDelegationDetails(this.wallet, [address]).then(details => {
          if (details && details.length > 0) {
            this.updateDisplayedDetails(details)
          }
        })
        this.operations.getRewardDisplayDetails(this.wallet, [address]).then(rewards => {
          this.hasRewardDetails = rewards !== undefined
          if (rewards) {
            this.updateDisplayedRewards(rewards)
          }
        })
      }
    })

    this.delegateeDetails$.subscribe(details => {
      this.delegateeAccountWidget = details
        ? new UIAccount({
            name: details.name,
            address: details.address
          })
        : null
    })

    this.delegatorDetails$.subscribe(async details => {
      if (details) {
        // TODO: add translations
        this.delegatorBalanceWidget = new UIIconText({
          iconName: 'wallet-outline',
          text: this.amountConverter.transform(details.balance, {
            protocolIdentifier: this.wallet.protocolIdentifier,
            maxDigits: 10
          }),
          description: 'Your balance'
        })

        this.setupAllActions(details)
        this.setupFormObservers()
        this.initActiveDelegatorAction(details)
      }
    })
  }

  private setupAllActions(details: AirGapDelegatorDetails) {
    this.setupActions(details.mainActions || [])
    this.setupActions(details.secondaryActions || [])
  }

  private setupActions(actions: AirGapDelegatorAction[]) {
    actions.forEach(action => {
      this.setupFormForAction(action)
      action.form = this.delegationForms.get(action.type)

      if (action.args) {
        action.args.forEach(arg => {
          arg.wallet = this.wallet
        })
      }
    })
  }

  private setupFormForAction(action: AirGapDelegatorAction) {
    if (action.form) {
      this.delegationForms.set(action.type, action.form)
    }

    const form = this.delegationForms.get(action.type)
    const formArgs = {}

    if (action.args) {
      action.args.forEach(arg => {
        formArgs[arg.id] = form ? form.value[arg.id] : null
      })
    }

    if (!form) {
      this.delegationForms.set(action.type, this.formBuilder.group(formArgs))
    } else {
      Object.keys(formArgs)
        .map(key => [key, formArgs[key]] as [string, any])
        .forEach(([key, value]) => form.addControl(key, value))
    }
  }

  private setupFormObservers() {
    Array.from(this.delegationForms.entries()).forEach(([type, formGroup]) => {
      formGroup.valueChanges.subscribe(() => {
        if (this.activeDelegatorAction === type.toString()) {
          setTimeout(() => {
            this.canProceed = formGroup.valid
          })
        }
      })
    })
  }

  private initActiveDelegatorAction(details: AirGapDelegatorDetails) {
    const activeAction = details.mainActions ? details.mainActions[0] : null
    this.onActiveActionChange(activeAction ? activeAction.type.toString() : null)
  }

  private updateDisplayedDetails(details: AirGapDelegationDetails[] | null) {
    // TODO: support multiple cases
    this.delegateeDetails$.next(details ? details[0].delegatees[0] : null)
    this.delegatorDetails$.next(details ? details[0].delegator : null)
  }

  private updateDisplayedRewards(rewardDisplayDetails: AirGapRewardDisplayDetails) {
    this.rewardDisplay$.next(rewardDisplayDetails)
  }

  private changeDisplayedDetails(address: string) {
    this.delegateeAddress$.next(address)
  }

  private callAction(actions: AirGapDelegatorAction[], type: string) {
    const action = actions.find(action => action.type.toString() === type)
    const actionType = action ? action.type : undefined

    if (actionType) {
      this.prepareDelegationAction(actionType)
    } else {
      console.warn('Unknown action')
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
      this.router
        .navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION, { skipLocationChange: true })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      this.dismissLoader()

      console.warn(error)
      this.showToast(error.message)
    }
  }

  private dismissLoader() {
    if (this.loader) {
      this.loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
    }
  }

  private async showToast(message: string): Promise<void> {
    const toast: HTMLIonToastElement = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom'
    })
    toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
  }
}
