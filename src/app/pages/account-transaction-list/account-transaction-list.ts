import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingController, Platform, PopoverController, ToastController } from '@ionic/angular'
import { AirGapMarketWallet, DelegationInfo, IAirGapTransaction, TezosKtProtocol } from 'airgap-coin-lib'
import { Action } from 'airgap-coin-lib/dist/actions/Action'
import { DelegateAction } from 'airgap-coin-lib/dist/actions/DelegateAction'
import { BigNumber } from 'bignumber.js'
import { promiseTimeout } from 'src/app/helpers/promise-timeout'

import { AccountEditPopoverComponent } from '../../components/account-edit-popover/account-edit-popover.component'
import { ActionGroup } from '../../models/ActionGroup'
import { AirGapDelegateAction } from '../../models/actions/DelegateAction'
import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ProtocolSymbols } from '../../services/protocols/protocols'
import { PushBackendProvider } from '../../services/push-backend/push-backend'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../../services/storage/storage'
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
  public transactions: IAirGapTransaction[] = []

  public protocolIdentifier: string

  public hasPendingTransactions: boolean = false
  public pendingTransactions: IAirGapTransaction[] = []

  // AE-Migration Stuff
  public aeTxEnabled: boolean = false
  public aeTxListEnabled: boolean = false
  public aeMigratedTokens: BigNumber = new BigNumber(0)
  public aeCurrentPhase: string = ''
  public aePhaseEnd: string = ''

  // XTZ
  public isKtDelegated: boolean = false

  public actions: Action<any, any>[]

  public lottieConfig: { path: string } = {
    path: '/assets/animations/loading.json'
  }

  private readonly TRANSACTION_LIMIT: number = 10
  private readonly actionGroup: ActionGroup

  constructor(
    private readonly route: ActivatedRoute,
    private readonly platform: Platform,
    private readonly storageProvider: StorageProvider,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly pushBackendProvider: PushBackendProvider,
    public readonly location: Location,
    public readonly router: Router,
    public readonly operationsProvider: OperationsProvider,
    public readonly popoverCtrl: PopoverController,
    public readonly accountProvider: AccountProvider,
    public readonly http: HttpClient,
    public readonly dataService: DataService
  ) {
    if (this.route.snapshot.data.special) {
      this.wallet = this.route.snapshot.data.special
    }

    this.protocolIdentifier = this.wallet.coinProtocol.identifier
    if (this.protocolIdentifier === ProtocolSymbols.AE) {
      this.http
        .get(`https://api-airgap.gke.papers.tech/api/v1/protocol/ae/migrations/pending/${this.wallet.addresses[0]}`)
        .subscribe((result: any) => {
          this.aeMigratedTokens = new BigNumber(result.phase.balance)
          this.aeCurrentPhase = result.phase.name
          this.aePhaseEnd = result.phase.endTimestamp
        })
    }

    if (this.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      this.isDelegated().catch(handleErrorSentry(ErrorCategory.COINLIB))
    }
    if (this.protocolIdentifier === ProtocolSymbols.XTZ) {
      this.getKtAddresses().catch(handleErrorSentry(ErrorCategory.COINLIB))
    }

    this.actionGroup = new ActionGroup(this)
    this.actions = this.actionGroup.getActions()

    this.init()
  }

  public async init() {
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

  /**
   * This is the "small" banner on top of the transaction.
   * This should be shown if the user has balance on mainnet,
   * but also balance on the next migration phase.
   */
  public showAeMigrationBanner() {
    return this.walletIsAe() && (this.wallet.currentBalance.gt(0) || this.transactions.length > 0) && this.aeMigratedTokens.gt(0)
  }

  /**
   * This is the full page screen informing the user about token migration
   * It should be shown when the user has migration balance, but no mainnet balance.
   */
  public showAeMigrationScreen() {
    return this.walletIsAe() && (this.wallet.currentBalance.eq(0) && this.transactions.length === 0) && this.aeMigratedTokens.gt(0)
  }

  public showNoTransactionScreen() {
    return this.transactions.length === 0 && !this.showAeMigrationScreen()
  }

  public walletIsAe() {
    return this.wallet.protocolIdentifier === ProtocolSymbols.AE
  }

  public ionViewWillEnter() {
    this.doRefresh()
  }

  public openPreparePage() {
    const info = {
      wallet: this.wallet,
      address: ''
    }
    this.dataService.setData(DataServiceKey.DETAIL, info)
    this.router.navigateByUrl('/transaction-prepare/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openReceivePage() {
    this.dataService.setData(DataServiceKey.DETAIL, this.wallet)
    this.router.navigateByUrl('/account-address/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openTransactionDetailPage(transaction: IAirGapTransaction) {
    this.dataService.setData(DataServiceKey.DETAIL, transaction)
    this.router.navigateByUrl('/transaction-detail/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openBlockexplorer() {
    const blockexplorer = this.wallet.coinProtocol.getBlockExplorerLinkForAddress(this.wallet.addresses[0])

    this.openUrl(blockexplorer)
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

  public doRefresh(event: any = null) {
    if (this.wallet.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      this.operationsProvider.refreshAllDelegationStatuses()
    }

    this.isRefreshing = true

    if (event) {
      event.target.complete()
    }

    // this can safely be removed after AE has made the switch to mainnet
    if (this.protocolIdentifier === ProtocolSymbols.AE) {
      this.http.get('https://api-airgap.gke.papers.tech/status').subscribe((result: any) => {
        this.aeTxEnabled = result.transactionsEnabled
        this.aeTxListEnabled = result.txListEnabled
        if (this.aeTxListEnabled) {
          this.loadInitialTransactions().catch(handleErrorSentry())
        } else {
          this.transactions = []
          this.isRefreshing = false
        }
      })
    } else {
      this.loadInitialTransactions().catch(handleErrorSentry())
    }
  }

  public async doInfinite(event) {
    if (!this.infiniteEnabled) {
      return event.target.complete()
    }

    const offset = this.txOffset - (this.txOffset % this.TRANSACTION_LIMIT)
    const newTransactions = await this.getTransactions(this.TRANSACTION_LIMIT, offset)

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

    await promiseTimeout(30000, transactionPromise).catch(() => {
      // either the txs are taking too long to load or there is actually a network error
      this.showLinkToBlockExplorer = true
    })

    const transactions: IAirGapTransaction[] = await transactionPromise

    this.transactions = this.mergeTransactions(this.transactions, transactions)

    const addr: string = this.wallet.receivingPublicAddress
    this.pendingTransactions = (await this.pushBackendProvider.getPendingTxs(addr, this.protocolIdentifier)) as IAirGapTransaction[]

    // remove duplicates from pendingTransactions
    const txHashes = this.transactions.map(value => value.hash)
    this.pendingTransactions = this.pendingTransactions.filter(value => {
      return txHashes.indexOf(value.hash) === -1
    })

    if (this.pendingTransactions.length > 0) {
      this.pendingTransactions = this.pendingTransactions.map(pendingTx => {
        pendingTx.fee = new BigNumber(pendingTx.fee)
        pendingTx.amount = new BigNumber(pendingTx.amount)

        return pendingTx
      })
      this.hasPendingTransactions = true
    } else {
      this.hasPendingTransactions = false
    }

    this.isRefreshing = false
    this.initialTransactionsLoaded = true

    this.accountProvider.triggerWalletChanged()
    await this.storageProvider.setCache<IAirGapTransaction[]>(this.accountProvider.getAccountIdentifier(this.wallet), this.transactions)
    this.txOffset = this.transactions.length

    this.infiniteEnabled = true
  }

  public async getTransactions(limit: number = 10, offset: number = 0): Promise<IAirGapTransaction[]> {
    const results = await Promise.all([this.wallet.fetchTransactions(limit, offset), this.wallet.synchronize()])

    return results[0]
  }

  public mergeTransactions(oldTransactions, newTransactions): IAirGapTransaction[] {
    if (!oldTransactions) {
      return newTransactions
    }
    const transactionMap = new Map<string, IAirGapTransaction>(
      oldTransactions.map((tx: IAirGapTransaction): [string, IAirGapTransaction] => [tx.hash, tx])
    )

    newTransactions.forEach(tx => {
      transactionMap.set(tx.hash, tx)
    })

    return Array.from(transactionMap.values()).sort((a, b) => b.timestamp - a.timestamp)
  }

  public async presentEditPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: AccountEditPopoverComponent,
      componentProps: {
        wallet: this.wallet,
        onDelete: () => {
          this.location.back()
        },
        onUndelegate: async () => {
          // TODO: Should we move this to it's own file?
          const delegateAction: AirGapDelegateAction = new AirGapDelegateAction({
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
    const { isDelegated }: DelegationInfo = await this.operationsProvider.checkDelegated(this.wallet.receivingPublicAddress)
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
    const delegateAction: DelegateAction<any> | undefined = this.actions.find(
      (action: Action<any, any>) => action.identifier === 'delegate-action' || action.identifier === 'view-delegation' 
    ) as DelegateAction<any>
    if (delegateAction) {
      await delegateAction.start()
    }
  }

  public showToast(message: string) {
    this.toastController
      .create({
        duration: 3000,
        message,
        showCloseButton: true,
        position: 'bottom'
      })
      .then(toast => {
        toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
  }
}
