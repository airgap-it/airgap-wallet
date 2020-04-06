import { HttpClient } from '@angular/common/http'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AlertController, LoadingController, Platform, PopoverController, ToastController, NavController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { AirGapMarketWallet, DelegationInfo, IAirGapTransaction, TezosKtProtocol, ICoinDelegateProtocol } from 'airgap-coin-lib'
import { Action } from 'airgap-coin-lib/dist/actions/Action'
import { TezosDelegateAction } from 'airgap-coin-lib/dist/actions/TezosDelegateAction'
import { BigNumber } from 'bignumber.js'

import { AccountEditPopoverComponent } from '../../components/account-edit-popover/account-edit-popover.component'
import { promiseTimeout } from '../../helpers/promise-timeout'
import { ActionGroup } from '../../models/ActionGroup'
import { AirGapTezosDelegateAction } from '../../models/actions/TezosDelegateAction'
import { AirGapTezosMigrateAction } from '../../models/actions/TezosMigrateAction'
import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ProtocolSymbols } from '../../services/protocols/protocols'
import { PushBackendProvider } from '../../services/push-backend/push-backend'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../../services/storage/storage'
import { supportsDelegation } from 'src/app/helpers/delegation'

// import 'core-js/es7/object'

declare let cordova

@Component({
  selector: 'page-account-transaction-list',
  templateUrl: 'account-transaction-list.html',
  styleUrls: ['./account-transaction-list.scss']
})
export class AccountTransactionListPage {
  public isRefreshing: boolean = false
  public initialTransactionsLoaded: boolean = false
  public infiniteEnabled: boolean = false
  public showLinkToBlockExplorer: boolean = false

  public txOffset: number = 0
  public wallet: AirGapMarketWallet
  public mainWallet?: AirGapMarketWallet

  public transactions: IAirGapTransaction[] = []

  public protocolIdentifier: string

  public hasPendingTransactions: boolean = false
  public pendingTransactions: IAirGapTransaction[] = []

  // XTZ
  public isKtDelegated: boolean = false

  public actions: Action<any, any>[]

  public lottieConfig: { path: string } = {
    path: '/assets/animations/loading.json'
  }

  private readonly TRANSACTION_LIMIT: number = 10
  private readonly actionGroup: ActionGroup

  constructor(
    public readonly alertCtrl: AlertController,
    public readonly navController: NavController,
    public readonly router: Router,
    public readonly translateService: TranslateService,
    public readonly operationsProvider: OperationsProvider,
    public readonly popoverCtrl: PopoverController,
    public readonly accountProvider: AccountProvider,
    public readonly http: HttpClient,
    public readonly dataService: DataService,
    private readonly route: ActivatedRoute,
    private readonly platform: Platform,
    private readonly storageProvider: StorageProvider,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly pushBackendProvider: PushBackendProvider
  ) {
    const info = this.route.snapshot.data.special
    if (this.route.snapshot.data.special) {
      this.wallet = info.wallet
    }

    this.protocolIdentifier = this.wallet.coinProtocol.identifier

    if (this.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      this.mainWallet = info.mainWallet
      this.isDelegated().catch(handleErrorSentry(ErrorCategory.COINLIB))
    }
    if (this.protocolIdentifier === ProtocolSymbols.XTZ) {
      this.getKtAddresses().catch(handleErrorSentry(ErrorCategory.COINLIB))
      this.isDelegated().catch(handleErrorSentry(ErrorCategory.COINLIB))
    }

    this.actionGroup = new ActionGroup(this)
    this.actions = this.actionGroup.getActions()

    this.init()
  }

  public async init(): Promise<void> {
    const lastTx: {
      protocol: string
      accountIdentifier: string
      date: number
    } = await this.storageProvider.get(SettingsKey.LAST_TX_BROADCAST)

    if (
      lastTx &&
      lastTx.protocol === this.wallet.protocolIdentifier &&
      lastTx.accountIdentifier === this.wallet.publicKey.substr(-6) &&
      lastTx.date > new Date().getTime() - 5 * 60 * 1000
    ) {
      this.hasPendingTransactions = true
    }
  }

  public showNoTransactionScreen(): boolean {
    return this.transactions.length === 0
  }

  public ionViewWillEnter(): void {
    this.doRefresh()
  }

  public openPreparePage(): void {
    if (this.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      const action = new AirGapTezosMigrateAction({
        wallet: this.wallet,
        mainWallet: this.mainWallet,
        alertCtrl: this.alertCtrl,
        translateService: this.translateService,
        dataService: this.dataService,
        router: this.router
      })
      action.start()
    } else {
      const info = {
        wallet: this.wallet,
        address: ''
      }
      this.dataService.setData(DataServiceKey.DETAIL, info)

      this.router.navigateByUrl('/transaction-prepare/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  public openReceivePage(): void {
    this.dataService.setData(DataServiceKey.DETAIL, this.wallet)
    this.router.navigateByUrl('/account-address/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openTransactionDetailPage(transaction: IAirGapTransaction): void {
    this.dataService.setData(DataServiceKey.DETAIL, transaction)
    this.router.navigateByUrl('/transaction-detail/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async openBlockexplorer(): Promise<void> {
    const blockexplorer = await this.wallet.coinProtocol.getBlockExplorerLinkForAddress(this.wallet.addresses[0])

    this.openUrl(blockexplorer)
  }

  private openUrl(url: string): void {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

  public doRefresh(event: any = null): void {
    if (
      this.wallet.protocolIdentifier === ProtocolSymbols.XTZ ||
      this.wallet.protocolIdentifier === ProtocolSymbols.XTZ_KT ||
      supportsDelegation(this.wallet.coinProtocol)
    ) {
      this.operationsProvider.refreshAllDelegationStatuses([this.wallet])
    }

    this.isRefreshing = true

    if (event) {
      event.target.complete()
    }

    this.loadInitialTransactions().catch(handleErrorSentry())
  }

  public async doInfinite(event): Promise<void> {
    if (!this.infiniteEnabled) {
      return event.target.complete()
    }

    const offset: number = this.txOffset - (this.txOffset % this.TRANSACTION_LIMIT)
    const newTransactions: IAirGapTransaction[] = await this.getTransactions(this.TRANSACTION_LIMIT, offset)

    this.transactions = this.mergeTransactions(this.transactions, newTransactions)
    this.txOffset = this.transactions.length

    await this.storageProvider.setCache<IAirGapTransaction[]>(this.accountProvider.getAccountIdentifier(this.wallet), this.transactions)

    if (newTransactions.length < this.TRANSACTION_LIMIT) {
      this.infiniteEnabled = false
    }

    event.target.complete()
  }

  public async loadInitialTransactions(): Promise<void> {
    if (this.transactions.length === 0) {
      this.transactions =
        (await this.storageProvider.getCache<IAirGapTransaction[]>(this.accountProvider.getAccountIdentifier(this.wallet))) || []
    }

    const transactionPromise: Promise<IAirGapTransaction[]> = this.getTransactions()

    await promiseTimeout(3000, transactionPromise).catch(() => {
      // either the txs are taking too long to load or there is actually a network error
      this.showLinkToBlockExplorer = true
    })

    const transactions: IAirGapTransaction[] = await transactionPromise

    this.transactions = this.mergeTransactions(this.transactions, transactions)

    this.isRefreshing = false
    this.initialTransactionsLoaded = true

    const addr: string = this.wallet.receivingPublicAddress

    this.pendingTransactions = (await this.pushBackendProvider.getPendingTxs(addr, this.protocolIdentifier)) as IAirGapTransaction[]

    // remove duplicates from pendingTransactions
    const txHashes: string[] = this.transactions.map(value => value.hash)
    this.pendingTransactions = this.pendingTransactions.filter(value => {
      return txHashes.indexOf(value.hash) === -1
    })

    if (this.pendingTransactions.length > 0) {
      this.pendingTransactions = this.pendingTransactions.map(pendingTx => {
        pendingTx.fee = new BigNumber(pendingTx.fee).toString(10)
        pendingTx.amount = new BigNumber(pendingTx.amount).toString(10)

        return pendingTx
      })
      this.hasPendingTransactions = true
    } else {
      this.hasPendingTransactions = false
    }

    this.accountProvider.triggerWalletChanged()
    await this.storageProvider.setCache<IAirGapTransaction[]>(this.accountProvider.getAccountIdentifier(this.wallet), this.transactions)
    this.txOffset = this.transactions.length

    this.infiniteEnabled = true
  }

  public async getTransactions(limit: number = 10, offset: number = 0): Promise<IAirGapTransaction[]> {
    const [transactions]: [IAirGapTransaction[], void] = await Promise.all([
      this.wallet.fetchTransactions(limit, offset),
      this.wallet.synchronize()
    ])

    return transactions
  }

  public mergeTransactions(oldTransactions: IAirGapTransaction[], newTransactions: IAirGapTransaction[]): IAirGapTransaction[] {
    if (!oldTransactions) {
      return newTransactions
    }
    const transactionMap: Map<string, IAirGapTransaction> = new Map<string, IAirGapTransaction>(
      oldTransactions.map((tx: IAirGapTransaction): [string, IAirGapTransaction] => [tx.hash, tx])
    )

    newTransactions.forEach(tx => {
      transactionMap.set(tx.hash, tx)
    })

    return Array.from(transactionMap.values()).sort((a, b) =>
      a.timestamp !== undefined && b.timestamp !== undefined
        ? b.timestamp - a.timestamp
        : new BigNumber(b.blockHeight).minus(new BigNumber(a.blockHeight)).toNumber()
    )
  }

  public async presentEditPopover(event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: AccountEditPopoverComponent,
      componentProps: {
        wallet: this.wallet,
        onDelete: (): void => {
          this.navController.pop()
        },
        onUndelegate: async (): Promise<void> => {
          // TODO: Should we move this to it's own file?
          const delegateAction: AirGapTezosDelegateAction = new AirGapTezosDelegateAction({
            wallet: this.wallet,
            delegate: undefined,
            toastController: this.toastController,
            loadingController: this.loadingController,
            dataService: this.dataService,
            router: this.router
          })

          await delegateAction.start()
        }
      },
      event,
      translucent: true
    })

    return popover.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  // Tezos
  public async isDelegated(): Promise<void> {
    const { isDelegated }: DelegationInfo = await this.operationsProvider.checkDelegated(
      this.wallet.coinProtocol as ICoinDelegateProtocol,
      this.wallet.receivingPublicAddress
    )
    this.isKtDelegated = isDelegated
    // const action = isDelegated ? this.getStatusAction() : this.getDelegateAction()
    // this.replaceAction(ActionType.DELEGATE, action)
  }

  public async getKtAddresses(): Promise<string[]> {
    const protocol: TezosKtProtocol = new TezosKtProtocol()
    const ktAddresses: string[] = await protocol.getAddressesFromPublicKey(this.wallet.publicKey)
    // const action = ktAddresses.length > 0 ? this.getStatusAction(ktAddresses) : this.getDelegateAction()
    // this.replaceAction(ActionType.DELEGATE, action)

    return ktAddresses
  }

  public async openDelegateSelection(): Promise<void> {
    const delegateAction: TezosDelegateAction<any> | undefined = this.actions.find(
      (action: Action<any, any>) => action.identifier === 'delegate-action' || action.identifier === 'view-delegation'
    ) as TezosDelegateAction<any>
    if (delegateAction) {
      await delegateAction.start()
    }
  }

  public async showToast(message: string): Promise<void> {
    const toast: HTMLIonToastElement = await this.toastController.create({
      duration: 3000,
      message,
      showCloseButton: true,
      position: 'bottom'
    })
    toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
