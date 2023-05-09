import { AmountConverterPipe, UIResource, UIResourceStatus } from '@airgap/angular-core'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { IACMessageType } from '@airgap/serializer'
import { Component, OnDestroy, OnInit } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingController, NavController, PopoverController, ToastController, ViewWillEnter } from '@ionic/angular'
import { OverlayEventDetail } from '@ionic/core'
import { BehaviorSubject, Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { DelegateActionPopoverComponent } from 'src/app/components/delegate-action-popover/delegate-action-popover.component'
import { supportsAirGapDelegation } from 'src/app/helpers/delegation'
import {
  AirGapDelegateeDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction,
  AirGapDelegatorDetails
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { UIAccount } from 'src/app/models/widgets/display/UIAccount'
import { UIAlert } from 'src/app/models/widgets/display/UIAlert'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { ExtensionsService } from 'src/app/services/extensions/extensions.service'
import { OperationsProvider } from 'src/app/services/operations/operations'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { isType } from 'src/app/utils/utils'

@Component({
  selector: 'app-delegation-detail',
  templateUrl: './delegation-detail.html',
  styleUrls: ['./delegation-detail.scss']
})
export class DelegationDetailPage implements OnInit, OnDestroy, ViewWillEnter {
  public UIResourceStatus: typeof UIResourceStatus = UIResourceStatus

  public wallet: AirGapMarketWallet

  public showOverflowMenu: boolean

  public delegationForms: Map<string, FormGroup> = new Map()
  public delegationAlertWidgets: UIResource<UIAlert[]> = { status: UIResourceStatus.IDLE, value: undefined }

  public delegateeLabel: string
  public delegateeLabelPlural: string
  public delegateeAccountWidget: UIResource<UIAccount> = { status: UIResourceStatus.IDLE, value: undefined }

  public delegatorBalanceWidget: UIResource<UIIconText> = { status: UIResourceStatus.IDLE, value: undefined }

  public activeDelegatorAction: string | null = null
  public activeDelegatorActionConfirmButton: string | null = null

  public delegateeDetails$: BehaviorSubject<UIResource<AirGapDelegateeDetails>> = new BehaviorSubject<UIResource<AirGapDelegateeDetails>>({
    status: UIResourceStatus.IDLE,
    value: undefined
  })
  public delegatorDetails$: BehaviorSubject<UIResource<AirGapDelegatorDetails>> = new BehaviorSubject<UIResource<AirGapDelegatorDetails>>({
    status: UIResourceStatus.IDLE,
    value: undefined
  })
  public rewardDisplay$: BehaviorSubject<UIResource<UIRewardList>> = new BehaviorSubject<UIResource<UIRewardList>>({
    status: UIResourceStatus.IDLE,
    value: undefined
  })

  public canProceed: boolean = true
  public hasRewardDetails: boolean | undefined = undefined

  public get shouldDisplaySegmentButtons(): boolean {
    const details = this.delegatorDetails$.value

    return details.value?.mainActions && details.value.mainActions.some((action) => !!action.description || !!action.args)
  }

  private get isAirGapDelegatee(): boolean {
    return supportsAirGapDelegation(this.wallet.protocol)
      ? this.wallet.protocol.airGapDelegatee() && this.delegateeAddress$.value === this.wallet.protocol.airGapDelegatee()
      : false
  }

  private get hideAirGapOverflow(): boolean {
    return supportsAirGapDelegation(this.wallet.protocol)
      ? !this.wallet.protocol.airGapDelegatee() || this.isAirGapDelegatee
      : this.isAirGapDelegatee
  }

  private readonly delegateeAddress$: BehaviorSubject<string | null> = new BehaviorSubject(null)
  private areMultipleDelegationsSupported: boolean = false

  private loader: HTMLIonLoadingElement | undefined

  private publicKey: string
  private protocolID: string
  private addressIndex

  private data$: BehaviorSubject<any>

  private _ngDestroyed$: Subject<void> | undefined
  private get ngDestroyed$(): Subject<void> {
    if (this._ngDestroyed$ === undefined) {
      this._ngDestroyed$ = new Subject()
    }

    return this._ngDestroyed$
  }

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
    private readonly amountConverter: AmountConverterPipe,
    public readonly accountProvider: AccountProvider
  ) {
    this.data$ = new BehaviorSubject(this.loadNavigationData())
  }

  public ngOnInit(): void {
    this.publicKey = this.route.snapshot.params.publicKey
    this.protocolID = this.route.snapshot.params.protocolID
    this.addressIndex = this.route.snapshot.params.addressIndex
    if (this.addressIndex === 'undefined') {
      this.addressIndex = undefined
    } else {
      this.addressIndex = Number(this.addressIndex)
    }
    this.wallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(this.publicKey, this.protocolID, this.addressIndex)

    this.extensionsService.loadDelegationExtensions().then(() => {
      this.initView(this.data$.value)
    })
  }

  public ngOnDestroy(): void {
    this._ngDestroyed$?.next()
    this._ngDestroyed$?.complete()
    this._ngDestroyed$ = undefined
  }

  public ionViewWillEnter(): void {
    const previousData = this.data$.value
    const currentData = this.loadNavigationData()

    if (previousData !== currentData) {
      this.data$.next(currentData)
    }
  }

  private loadNavigationData(): any {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      return info?.data ?? info
    }

    return undefined
  }

  public filterVisible(widgets?: UIWidget[]): UIWidget[] {
    return widgets ? widgets.filter((widget) => widget.isVisible) : []
  }

  public async presentEditPopover(event: Event): Promise<void> {
    const delegatorDetails = this.delegatorDetails$.value
    const secondaryActions = delegatorDetails.value ? delegatorDetails.value.secondaryActions : undefined

    const popover: HTMLIonPopoverElement = await this.popoverController.create({
      component: DelegateActionPopoverComponent,
      componentProps: {
        hideAirGap: this.hideAirGapOverflow,
        delegateeLabel: this.delegateeLabel,
        secondaryDelegatorActions: secondaryActions
      },
      event,
      translucent: true
    })

    popover
      .onDidDismiss()
      .then(async ({ data }: OverlayEventDetail<unknown>) => {
        if (isType<{ changeToAirGap: boolean }>(data, 'changeToAirGap') && supportsAirGapDelegation(this.wallet.protocol)) {
          this.changeDisplayedDetails(this.wallet.protocol.airGapDelegatee())
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

    if (!delegatorDetails.value?.mainActions || delegatorDetails.value.mainActions.length === 0) {
      this.navController.back()
      return
    }

    this.callAction(delegatorDetails.value.mainActions, type)
  }

  public callSecondaryAction(type: string) {
    const delegatorDetails = this.delegatorDetails$.value
    if (!delegatorDetails.value) {
      return
    }

    this.callAction(delegatorDetails.value.secondaryActions || [], type)
  }

  public onActiveActionChange(activeDelegatorAction: string | null) {
    const activeAction = this.delegatorDetails$.value.value?.mainActions
      ? this.delegatorDetails$.value.value.mainActions.find((action) => action.type.toString() === activeDelegatorAction)
      : null

    this.activeDelegatorAction = activeDelegatorAction
    this.activeDelegatorActionConfirmButton =
      activeAction && !activeAction.disabled ? activeAction.confirmLabel || activeAction.label : null
  }

  public showDelegateesList() {
    const info = {
      wallet: this.wallet,
      delegateeLabel: this.delegateeLabel,
      delegateeLabelPlural: this.delegateeLabelPlural,
      areMultipleDelegationsSupported: this.areMultipleDelegationsSupported,
      currentDelegatees: this.delegatorDetails$.value.value?.delegatees,
      data: this.data$.value,
      callback: (address: string) => {
        this.changeDisplayedDetails(address)
      }
    }

    this.dataService.setData(DataServiceKey.DETAIL, info)
    this.router
      .navigateByUrl('/delegation-list/' + DataServiceKey.DETAIL, { skipLocationChange: true })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private initView(data: any) {
    this.delegateeLabel = supportsAirGapDelegation(this.wallet.protocol)
      ? this.wallet.protocol.delegateeLabel
      : 'delegation-detail.default-delegatee-label'

    this.delegateeLabelPlural = supportsAirGapDelegation(this.wallet.protocol)
      ? this.wallet.protocol.delegateeLabelPlural
      : 'delegation-detail.defailt-delegatee-label-plural'

    this.areMultipleDelegationsSupported = supportsAirGapDelegation(this.wallet.protocol)
      ? this.wallet.protocol.supportsMultipleDelegations
      : false

    this.subscribeObservables()

    // tslint:disable-next-line: no-floating-promises
    this.operations.getCurrentDelegatees(this.wallet, data).then((addresses) => {
      if (addresses) {
        this.delegateeAddress$.next(addresses[0])
      }
    })
  }

  private subscribeObservables() {
    this.data$.pipe(takeUntil(this.ngDestroyed$)).subscribe(async (data) => {
      const currentDelegatees = await this.operations.getCurrentDelegatees(this.wallet, data)
      const address = currentDelegatees[0] ?? this.delegateeAddress$.value
      this.loadDelegationDetails(address, data)
    })

    this.delegateeAddress$.pipe(takeUntil(this.ngDestroyed$)).subscribe((address) => {
      if (address) {
        this.loadDelegationDetails(address, this.data$.value)
      }
    })

    this.delegateeDetails$.pipe(takeUntil(this.ngDestroyed$)).subscribe((details) => {
      this.delegateeAccountWidget = {
        status: details.status,
        value: details.value
          ? new UIAccount({
              name: details.value.name,
              address: details.value.address,
              logo: details.value.logo,
              shortenAddress: true
            })
          : undefined
      }
    })

    this.delegatorDetails$.pipe(takeUntil(this.ngDestroyed$)).subscribe(async (details) => {
      this.showOverflowMenu =
        !(this.isAirGapDelegatee || this.hideAirGapOverflow) || (details && details.value?.secondaryActions && details.value?.secondaryActions.length > 0)

      this.delegatorBalanceWidget = {
        status: details.status,
        value: details.value
          ? new UIIconText({
              iconName: 'wallet-outline',
              text: await this.amountConverter.transform(details.value.balance, {
                protocol: this.wallet.protocol,
                maxDigits: this.wallet.protocol.decimals
              }),
              description: 'delegation-detail.your-balance_label'
            })
          : undefined
      }

      if (details.value) {
        this.setupAllActions(details.value)
        this.setupFormObservers()
        this.initActiveDelegatorAction(details.value)
      }
    })
  }

  private loadDelegationDetails(address: string, data: any) {
    this.updateDisplayedDetails({ status: UIResourceStatus.LOADING, value: undefined })
    this.updateDisplayedRewards({ status: UIResourceStatus.LOADING, value: undefined })

    // tslint:disable-next-line: no-floating-promises
    this.operations.getDelegationDetails(this.wallet, [address], data).then((details) => {
      if (details && details.length > 0) {
        this.updateDisplayedDetails({ status: UIResourceStatus.SUCCESS, value: details })
      }
    })
    // tslint:disable-next-line: no-floating-promises
    this.operations.getRewardDisplayDetails(this.wallet, [address], data).then((rewards) => {
      this.hasRewardDetails = rewards !== undefined
      if (rewards) {
        this.updateDisplayedRewards({ status: UIResourceStatus.SUCCESS, value: rewards })
      }
    })
  }

  private setupAllActions(details: AirGapDelegatorDetails) {
    this.setupActions(details.mainActions || [])
    this.setupActions(details.secondaryActions || [])
  }

  private setupActions(actions: AirGapDelegatorAction[]) {
    actions.forEach((action) => {
      this.setupFormForAction(action)
      action.form = this.delegationForms.get(action.type)

      if (action.args) {
        action.args.forEach((arg) => {
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
      action.args.forEach((arg) => {
        formArgs[arg.id] = form ? form.value[arg.id] : null
      })
    }

    if (!form) {
      this.delegationForms.set(action.type, this.formBuilder.group(formArgs))
    } else {
      Object.keys(formArgs)
        .map((key) => [key, formArgs[key]] as [string, any])
        .forEach(([key, value]) => form.addControl(key, value))
    }
  }

  private setupFormObservers() {
    Array.from(this.delegationForms.entries()).forEach(([type, formGroup]) => {
      formGroup.valueChanges.pipe(takeUntil(this.ngDestroyed$)).subscribe(() => {
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

  private updateDisplayedDetails(details: UIResource<AirGapDelegationDetails[]>) {
    // TODO: support multiple cases
    this.delegationAlertWidgets = {
      status: details.status,
      value: details.value ? details.value[0].alerts : undefined
    }

    this.delegateeDetails$.next({
      status: details.status,
      value: details.value ? details.value[0].delegatees[0] : undefined
    })
    this.delegatorDetails$.next({
      status: details.status,
      value: details.value ? details.value[0].delegator : undefined
    })
  }

  private updateDisplayedRewards(rewardDisplay: UIResource<UIRewardList>) {
    this.rewardDisplay$.next(rewardDisplay)
  }

  private changeDisplayedDetails(address: string) {
    this.delegateeAddress$.next(address)
  }

  private callAction(actions: AirGapDelegatorAction[], type: string) {
    const action = actions.find((action) => action.type.toString() === type)
    const actionType = action ? action.type : undefined

    if (action.disabled) {
      this.navController.back()
      return
    }

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
      const { airGapTxs, unsignedTx } = await this.operations.prepareDelegatorAction(this.wallet, actionType, data)

      this.dismissLoader()

      this.accountProvider.startInteraction(this.wallet, unsignedTx, IACMessageType.TransactionSignRequest, airGapTxs)
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
