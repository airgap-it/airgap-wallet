import { InternalStorageKey, InternalStorageService, ProtocolService } from '@airgap/angular-core'
import {
  AirGapMarketWallet,
  IAirGapTransaction,
  MainProtocolSymbols,
  SubProtocolSymbols
} from '@airgap/coinlib-core'
import { Action } from '@airgap/coinlib-core/actions/Action'
import { IAirGapTransactionResult, IProtocolTransactionCursor } from '@airgap/coinlib-core/interfaces/IAirGapTransaction'
import { TezosKtProtocol } from '@airgap/tezos'
import { TezosKtAddressResult } from '@airgap/tezos/v0/protocol/types/kt/TezosKtAddressResult'
import { HttpClient } from '@angular/common/http'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AlertController, LoadingController, NavController, Platform, PopoverController, ToastController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { BigNumber } from 'bignumber.js'
import { Subscription, timer } from 'rxjs'
import { supportsDelegation } from 'src/app/helpers/delegation'
import { UIAccountExtendedDetails } from 'src/app/models/widgets/display/UIAccountExtendedDetails'
import { BrowserService } from 'src/app/services/browser/browser.service'
import { ExtensionsService } from 'src/app/services/extensions/extensions.service'
import { InteractionService } from 'src/app/services/interaction/interaction.service'

import { AccountEditPopoverComponent } from '../../components/account-edit-popover/account-edit-popover.component'
import { promiseTimeout } from '../../helpers/promise'
import { ActionGroup } from '../../models/ActionGroup'
import { AirGapTezosMigrateAction } from '../../models/actions/TezosMigrateAction'
import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { PushBackendProvider } from '../../services/push-backend/push-backend'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { WalletStorageService } from '../../services/storage/storage'

import { ExchangeProvider } from './../../services/exchange/exchange'

export const refreshRate = 3000

@Component({
  selector: 'page-account-transaction-list',
  templateUrl: 'account-transaction-list.html',
  styleUrls: ['./account-transaction-list.scss']
})
export class AccountTransactionListPage {
  public mainProtocolSymbols: typeof MainProtocolSymbols = MainProtocolSymbols
  public subProtocolSymbols: typeof SubProtocolSymbols = SubProtocolSymbols

  private timer$ = timer(0, refreshRate)
  private subscription: Subscription = new Subscription()

  public isRefreshing: boolean = false
  public initialTransactionsLoaded: boolean = false
  public infiniteEnabled: boolean = false
  public infiniteScrollActivated: boolean = false
  public isDesktop: boolean = false
  public showLinkToBlockExplorer: boolean = false

  public txOffset: number = 0
  public wallet: AirGapMarketWallet
  public balance: BigNumber | undefined

  public transactions: IAirGapTransaction[] = []

  public protocolIdentifier: string

  public pendingTransactions: IAirGapTransaction[] = []

  public get hasPendingTransactions(): boolean {
    return this.pendingTransactions.length > 0
  }

  public formattedExchangeTransactions: IAirGapTransaction[] = []

  public get hasExchangeTransactions(): boolean {
    return this.formattedExchangeTransactions.length > 0
  }

  public accountExtendedDetails: UIAccountExtendedDetails

  // XTZ
  public isKtDelegated: boolean = false

  public actions: Action<any, any>[]

  public lottieConfig: { path: string } = {
    path: './assets/animations/loading.json'
  }
  private transactionResult: IAirGapTransactionResult
  private readonly TRANSACTION_LIMIT: number = 10
  private readonly actionGroup: ActionGroup

  private readonly walletChanged: Subscription

  private publicKey: string
  private protocolID: string
  private addressIndex

  // Mt Perelin
  public isMtPerelinActive: boolean = false

  constructor(
    public readonly alertCtrl: AlertController,
    public readonly navController: NavController,
    public readonly router: Router,
    public readonly translateService: TranslateService,
    public readonly operationsProvider: OperationsProvider,
    public readonly popoverCtrl: PopoverController,
    public readonly toastController: ToastController,
    public readonly loadingController: LoadingController,
    public readonly accountProvider: AccountProvider,
    public readonly http: HttpClient,
    public readonly dataService: DataService,
    public readonly protocolService: ProtocolService,
    public readonly interactionService: InteractionService,
    private readonly route: ActivatedRoute,
    private readonly platform: Platform,
    private readonly storageProvider: WalletStorageService,
    private readonly pushBackendProvider: PushBackendProvider,
    private readonly exchangeProvider: ExchangeProvider,
    private readonly extensionsService: ExtensionsService,
    private readonly browserService: BrowserService,
    private readonly storageService: InternalStorageService
  ) {
    this.isDesktop = this.platform.is('desktop')

    this.publicKey = this.route.snapshot.params.publicKey
    this.protocolID = this.route.snapshot.params.protocolID
    this.addressIndex = this.route.snapshot.params.addressIndex

    if (this.addressIndex === 'undefined') {
      this.addressIndex = undefined
    } else {
      this.addressIndex = Number(this.addressIndex)
    }

    this.wallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(this.publicKey, this.protocolID, this.addressIndex)
    this.balance = this.wallet.getCurrentBalance()

    this.updateExtendedDetails()
    this.walletChanged = accountProvider.walletChangedObservable.subscribe(() => {
      this.loadInitialTransactions(true)
      this.updateExtendedDetails()
    })

    this.subscription = this.timer$.subscribe(async () => {
      if (this.hasExchangeTransactions) {
        this.formattedExchangeTransactions = await this.exchangeProvider.getExchangeTransactionsByProtocol(
          this.wallet.protocol.identifier,
          this.wallet.addresses[0]
        )
      }
    })

    this.protocolIdentifier = this.wallet.protocol.identifier

    if (this.protocolIdentifier === SubProtocolSymbols.XTZ_KT) {
      this.isDelegated().catch(handleErrorSentry(ErrorCategory.COINLIB))
    }
    if (this.protocolIdentifier === MainProtocolSymbols.XTZ) {
      this.getKtAddresses().catch(handleErrorSentry(ErrorCategory.COINLIB))
      this.isDelegated().catch(handleErrorSentry(ErrorCategory.COINLIB))
    }

    this.actionGroup = new ActionGroup(this)
    this.actionGroup.getActions().then((actions) => {
      this.actions = actions
    })

    // Mt Perelin
    this.storageService.get(InternalStorageKey.SETTINGS_TRADING_USE_MTPELERIN).then((active) => {
      if (active) {
        this.storageProvider.getCache('mtperelin-currencies').then((savedCurrencies) => {
          this.wallet.protocol.getSymbol().then((symbol) => {
            const validCurrency = Object.values(savedCurrencies).find((currency) => currency.symbol === symbol)
            this.isMtPerelinActive = !!active && !!validCurrency
          })
        })
      }
    })
  }

  public showNoTransactionScreen(): boolean {
    return this.transactions.length === 0
  }

  public ionViewWillEnter(): void {
    this.doRefresh()
  }

  public openPreparePage() {
    let info
    if (this.protocolIdentifier === SubProtocolSymbols.XTZ_KT) {
      const action = new AirGapTezosMigrateAction({
        wallet: this.wallet,
        alertCtrl: this.alertCtrl,
        translateService: this.translateService,
        protocolService: this.protocolService,
        dataService: this.dataService,
        router: this.router
      })
      action.start()
      return
    } else if (this.protocolIdentifier === SubProtocolSymbols.XTZ_BTC) {
      info = {
        wallet: this.wallet,
        address: '',
        disableFees: true
      }
    } else {
      info = {
        wallet: this.wallet,
        address: ''
      }
    }
    this.router
      .navigateByUrl(
        `/transaction-prepare/${DataServiceKey.DETAIL}/${this.publicKey}/${this.protocolID}/${this.addressIndex}/${
          info.address !== ''
        }/${0}/undefined/${'not_forced'}`
      )
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openReceivePage(): void {
    this.router
      .navigateByUrl(`/account-address/${DataServiceKey.DETAIL}/${this.publicKey}/${this.protocolID}/${this.addressIndex}`)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openTransactionDetailPage(transaction: IAirGapTransaction): void {
    this.dataService.setData(DataServiceKey.DETAIL, transaction)
    this.router
      .navigateByUrl(`/transaction-detail/${DataServiceKey.DETAIL}/${transaction.hash}`)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async openBlockexplorer(): Promise<void> {
    const blockexplorer = await this.wallet.protocol.getBlockExplorerLinkForAddress(this.wallet.addresses[0])

    this.browserService.openUrl(blockexplorer)
  }

  public doRefresh(event: any = null): void {
    if (supportsDelegation(this.wallet.protocol)) {
      this.operationsProvider.refreshAllDelegationStatuses([this.wallet])
    }

    this.isRefreshing = true

    if (event) {
      event.target.complete()
    }

    this.loadInitialTransactions().catch(handleErrorSentry())
  }

  public async loadMoreTransactions() {
    const newTransactions: IAirGapTransaction[] = await this.getTransactions(
      this.transactionResult ? this.transactionResult.cursor : undefined,
      this.TRANSACTION_LIMIT
    )

    this.transactions = this.transactions.concat(newTransactions)

    await this.storageProvider.setCache<IAirGapTransaction[]>(
      await this.accountProvider.getAccountIdentifier(this.wallet),
      this.transactions
    )

    this.infiniteEnabled = newTransactions.length >= this.TRANSACTION_LIMIT
  }

  public async doInfinite(event?: { target: { complete: () => void | PromiseLike<void> } }): Promise<void> {
    this.infiniteScrollActivated = true
    if (!this.infiniteEnabled) {
      return event.target.complete()
    }

    await this.loadMoreTransactions()
    event.target.complete()
  }

  public async loadInitialTransactions(forceRefresh: boolean = false): Promise<void> {
    if (forceRefresh || this.transactions.length === 0) {
      this.transactions =
        (await this.storageProvider.getCache<IAirGapTransaction[]>(await this.accountProvider.getAccountIdentifier(this.wallet)))?.slice(
          0,
          10
        ) ?? []
    }

    const transactionPromise: Promise<IAirGapTransaction[]> = this.getTransactions(undefined, this.TRANSACTION_LIMIT)
    this.showLinkToBlockExplorer = false
    const transactions: IAirGapTransaction[] = await promiseTimeout(30000, transactionPromise).catch((error) => {
      console.error(error)
      // either the txs are taking too long to load or there is actually a network error
      this.showLinkToBlockExplorer = true
      return []
    })

    if (transactions.length > 0) {
      this.transactions = transactions
    }

    this.isRefreshing = false
    this.initialTransactionsLoaded = true

    const addr: string = this.wallet.receivingPublicAddress

    try {
      this.pendingTransactions = (await this.pushBackendProvider.getPendingTxs(addr, this.protocolIdentifier)) as IAirGapTransaction[]
    } catch (err) {}

    this.formattedExchangeTransactions = await this.exchangeProvider.getExchangeTransactionsByProtocol(
      this.wallet.protocol.identifier,
      this.wallet.addresses[0]
    )

    // remove duplicates from pendingTransactions
    const txHashes: string[] = this.transactions.map((value) => value.hash)
    this.pendingTransactions = this.pendingTransactions.filter((value) => {
      return txHashes.indexOf(value.hash) === -1
    })

    if (this.hasPendingTransactions) {
      this.pendingTransactions = this.pendingTransactions.map((pendingTx) => {
        pendingTx.fee = new BigNumber(pendingTx.fee).toString(10)
        pendingTx.amount = new BigNumber(pendingTx.amount).toString(10)

        return pendingTx
      })
    }

    await this.storageProvider.setCache<IAirGapTransaction[]>(
      await this.accountProvider.getAccountIdentifier(this.wallet),
      this.transactions
    )
    this.txOffset = this.transactions.length

    this.infiniteEnabled = this.transactions.length >= this.TRANSACTION_LIMIT
    this.infiniteScrollActivated = false
  }

  public async getTransactions(cursor?: IProtocolTransactionCursor, limit: number = 10): Promise<IAirGapTransaction[]> {
    const [transactionResult]: [IAirGapTransactionResult, void] = await Promise.all([
      this.transactionResult ? this.wallet.fetchTransactions(limit, cursor) : this.wallet.fetchTransactions(limit),
      this.wallet.synchronize().catch((error) => {
        console.error(error)
      })
    ])

    this.transactionResult = transactionResult
    return transactionResult.transactions
  }

  public async presentEditPopover(event: any): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: AccountEditPopoverComponent,
      componentProps: {
        wallet: this.wallet,
        importAccountAction:
          this.wallet.protocol.identifier === MainProtocolSymbols.XTZ ? this.actionGroup.getImportAccountsAction() : undefined,
        onDelete: (): void => {
          this.navController.pop()
        }
      },
      event,
      translucent: true
    })

    return popover.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  // Tezos
  public async isDelegated(): Promise<void> {
    const isDelegated = await this.operationsProvider.checkDelegated(this.wallet)
    this.isKtDelegated = isDelegated
    // const action = isDelegated ? this.getStatusAction() : this.getDelegateAction()
    // this.replaceAction(ActionType.DELEGATE, action)
  }

  public async getKtAddresses(): Promise<string[]> {
    const protocol: TezosKtProtocol = new TezosKtProtocol()
    const ktAddresses: TezosKtAddressResult[] = await protocol.getAddressesFromPublicKey(this.wallet.publicKey)
    // const action = ktAddresses.length > 0 ? this.getStatusAction(ktAddresses) : this.getDelegateAction()
    // this.replaceAction(ActionType.DELEGATE, action)

    return ktAddresses.map((address: TezosKtAddressResult) => address.address)
  }

  public async openDelegationDetails(): Promise<void> {
    const delegateAction = this.actions.find((action) => action.identifier === 'delegate-action')
    if (delegateAction) {
      await delegateAction.start()
    }
  }

  public async showToast(message: string): Promise<void> {
    const toast: HTMLIonToastElement = await this.toastController.create({
      duration: 3000,
      message,
      buttons: [
        {
          text: 'Ok',
          role: 'cancel'
        }
      ],
      position: 'bottom'
    })
    toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private updateExtendedDetails() {
    if (supportsDelegation(this.wallet.protocol) && this.wallet.receivingPublicAddress !== undefined) {
      this.extensionsService.loadDelegationExtensions().then(async () => {
        this.accountExtendedDetails = await this.operationsProvider.getAccountExtendedDetails(this.wallet)
      })
    }
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe()
    this.walletChanged.unsubscribe()
  }

  // Mt Perelin
  public async buyMtPerelin() {
    this.wallet.protocol.getSymbol().then((symbol) => {
      window.open(`https://buy.mtpelerin.com/?type=direct-link&bdc=${symbol}&addr=${this.wallet.addresses[0]}&rfr=bcH4RmHm`, '_blank')
    })
  }

  public async sellMtPerelin() {
    this.wallet.protocol.getSymbol().then((symbol) => {
      window.open(`https://sell.mtpelerin.com/?type=direct-link&tab=sell&ssc=${symbol}&rfr=bcH4RmHm`, '_blank')
    })
  }
}
