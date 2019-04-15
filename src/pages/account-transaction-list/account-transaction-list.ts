import { Component } from '@angular/core'
import { IAirGapTransaction, AirGapMarketWallet, TezosKtProtocol } from 'airgap-coin-lib'
import { Platform, NavController, NavParams, PopoverController, ToastController } from 'ionic-angular'

import { TransactionDetailPage } from '../transaction-detail/transaction-detail'
import { TransactionPreparePage } from '../transaction-prepare/transaction-prepare'
import { AccountEditPopoverComponent } from '../../components/account-edit-popover/account-edit-popover.component'
import { AccountProvider } from '../../providers/account/account.provider'
import { HttpClient } from '@angular/common/http'
import { BigNumber } from 'bignumber.js'
import { StorageProvider, SettingsKey } from '../../providers/storage/storage'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { AccountAddressPage } from '../account-address/account-address'
import { DelegationBakerDetailPage } from '../delegation-baker-detail/delegation-baker-detail'
import { OperationsProvider, ActionType } from '../../providers/operations/operations'
import { SubAccountAddPage } from '../sub-account-add/sub-account-add'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { ProtocolSymbols } from 'src/providers/protocols/protocols'

interface CoinAction {
  type: ActionType
  name: string
  icon: string
  action: () => void
}

declare let cordova

@Component({
  selector: 'page-account-transaction-list',
  templateUrl: 'account-transaction-list.html'
})
export class AccountTransactionListPage {
  isRefreshing = false
  initialTransactionsLoaded = false
  infiniteEnabled = false
  txOffset: number = 0
  wallet: AirGapMarketWallet
  transactions: IAirGapTransaction[] = []

  protocolIdentifier: string

  hasPendingTransactions: boolean = false

  // AE-Migration Stuff
  aeTxEnabled: boolean = false
  aeTxListEnabled: boolean = false
  aeMigratedTokens: BigNumber = new BigNumber(0)
  aeCurrentPhase: string = ''
  aePhaseEnd: string = ''

  // XTZ
  isKtDelegated: boolean = false

  actions: CoinAction[] = []

  lottieConfig = {
    path: '/assets/animations/loading.json'
  }

  private TRANSACTION_LIMIT = 10

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public popoverCtrl: PopoverController,
    public accountProvider: AccountProvider,
    public http: HttpClient,
    private platform: Platform,
    private operationsProvider: OperationsProvider,
    private storageProvider: StorageProvider,
    private toastController: ToastController
  ) {
    this.wallet = this.navParams.get('wallet')
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
    if (this.protocolIdentifier === XTZ) {
      this.getKtAddresses().catch(handleErrorSentry(ErrorCategory.COINLIB))
    }

    this.init()
  }

  async init() {
    const supportedActions = this.operationsProvider.getActionsForCoin(this.wallet.protocolIdentifier)

    supportedActions.forEach(action => {
      if (action === ActionType.IMPORT_ACCOUNT) {
        this.actions.push(this.getImportAccountAction())
      } else if (action === ActionType.ADD_TOKEN) {
        this.actions.push(this.getAddTokenAction())
      } else if (action === ActionType.DELEGATE) {
        this.actions.push(this.getDelegateAction())
      } else {
        const assertNever = (x: never) => undefined
        assertNever(action)
      }
    })

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

  getImportAccountAction(): CoinAction {
    return {
      type: ActionType.IMPORT_ACCOUNT,
      name: 'account-transaction-list.import-accounts_label',
      icon: 'add',
      action: async () => {
        const protocol = new TezosKtProtocol()
        const ktAddresses = await protocol.getAddressesFromPublicKey(this.wallet.publicKey)

        if (ktAddresses.length === 0) {
          this.showToast('No accounts to import.')
        } else {
          for (let [index, _ktAddress] of ktAddresses.entries()) {
            await this.operationsProvider.addKtAddress(this.wallet, index, ktAddresses)
          }

          await this.navCtrl.pop()
          this.showToast('Accounts imported')
        }
      }
    }
  }

  private getAddTokenAction(): CoinAction {
    return {
      type: ActionType.ADD_TOKEN,
      name: 'account-transaction-list.add-tokens_label',
      icon: 'add',
      action: () => {
        this.openAccountAddPage(SubProtocolType.TOKEN, this.wallet)
      }
    }
  }

  private getDelegateAction(): CoinAction {
    return {
      type: ActionType.DELEGATE,
      name: 'account-transaction-list.delegate_label',
      icon: 'logo-usd',
      action: async () => {
        this.openDelegateSelection()
      }
    }
  }

  private getStatusAction(ktAddresses?: string[]): CoinAction {
    return {
      type: ActionType.DELEGATE,
      name: 'account-transaction-list.delegation-status_label',
      icon: 'md-information-circle',
      action: async () => {
        let wallet = this.wallet
        if (ktAddresses) {
          wallet = await this.operationsProvider.addKtAddress(this.wallet, 0, ktAddresses)
        }
        this.openDelegateSelection(wallet)
      }
    }
  }

  /**
   * This is the "small" banner on top of the transaction.
   * This should be shown if the user has balance on mainnet,
   * but also balance on the next migration phase.
   */
  showAeMigrationBanner() {
    return this.walletIsAe() && (this.wallet.currentBalance.gt(0) || this.transactions.length > 0) && this.aeMigratedTokens.gt(0)
  }

  /**
   * This is the full page screen informing the user about token migration
   * It should be shown when the user has migration balance, but no mainnet balance.
   */
  showAeMigrationScreen() {
    return this.walletIsAe() && (this.wallet.currentBalance.eq(0) && this.transactions.length === 0) && this.aeMigratedTokens.gt(0)
  }

  showNoTransactionScreen() {
    return this.transactions.length === 0 && !this.showAeMigrationScreen()
  }

  walletIsAe() {
    return this.wallet.protocolIdentifier === ProtocolSymbols.AE
  }

  ionViewWillEnter() {
    this.doRefresh()
  }

  openPreparePage() {
    this.navCtrl
      .push(TransactionPreparePage, {
        wallet: this.wallet
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openReceivePage() {
    this.navCtrl
      .push(AccountAddressPage, {
        wallet: this.wallet
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openTransactionDetailPage(transaction: IAirGapTransaction) {
    this.navCtrl
      .push(TransactionDetailPage, {
        transaction: transaction
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openBlockexplorer() {
    let blockexplorer = ''
    if (this.protocolIdentifier.startsWith('btc')) {
      blockexplorer = 'https://live.blockcypher.com/btc/address/{{address}}/'
    } else if (this.protocolIdentifier.startsWith('eth')) {
      blockexplorer = 'https://etherscan.io/address/{{address}}'
    } else if (this.protocolIdentifier.startsWith('ae')) {
      blockexplorer = 'https://explorer.aepps.com/#/account/{{address}}'
    } else if (this.protocolIdentifier.startsWith('xtz')) {
      blockexplorer = 'https://tzscan.io/{{address}}'
    }
    this.openUrl(blockexplorer.replace('{{address}}', this.wallet.addresses[0]))
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

  doRefresh(refresher: any = null) {
    if (this.wallet.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      this.operationsProvider.refreshAllDelegationStatuses()
    }

    this.isRefreshing = true

    if (refresher) {
      refresher.complete()
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

  async doInfinite(infiniteScroll) {
    if (!this.infiniteEnabled) {
      return infiniteScroll.complete()
    }

    const offset = this.txOffset - (this.txOffset % this.TRANSACTION_LIMIT)
    const newTransactions = await this.getTransactions(this.TRANSACTION_LIMIT, offset)

    this.transactions = this.mergeTransactions(this.transactions, newTransactions)
    this.txOffset = this.transactions.length

    await this.storageProvider.setCache<IAirGapTransaction[]>(this.accountProvider.getAccountIdentifier(this.wallet), this.transactions)

    if (newTransactions.length < this.TRANSACTION_LIMIT) {
      this.infiniteEnabled = false
    }

    infiniteScroll.complete()
  }

  async loadInitialTransactions(): Promise<void> {
    if (this.transactions.length === 0) {
      this.transactions =
        (await this.storageProvider.getCache<IAirGapTransaction[]>(this.accountProvider.getAccountIdentifier(this.wallet))) || []
    }

    const transactions = await this.getTransactions()

    this.transactions = this.mergeTransactions(this.transactions, transactions)

    this.isRefreshing = false
    this.initialTransactionsLoaded = true

    this.accountProvider.triggerWalletChanged()
    await this.storageProvider.setCache<IAirGapTransaction[]>(this.accountProvider.getAccountIdentifier(this.wallet), this.transactions)
    this.txOffset = this.transactions.length

    this.infiniteEnabled = true
  }

  async getTransactions(limit: number = 10, offset: number = 0): Promise<IAirGapTransaction[]> {
    const results = await Promise.all([this.wallet.fetchTransactions(limit, offset), this.wallet.synchronize()])
    return results[0]
  }

  mergeTransactions(oldTransactions, newTransactions): IAirGapTransaction[] {
    if (!oldTransactions) {
      return newTransactions
    }
    let transactionMap = new Map<string, IAirGapTransaction>(
      oldTransactions.map((tx: IAirGapTransaction): [string, IAirGapTransaction] => [tx.hash, tx])
    )

    newTransactions.forEach(tx => {
      transactionMap.set(tx.hash, tx)
    })

    return Array.from(transactionMap.values()).sort((a, b) => b.timestamp - a.timestamp)
  }

  presentEditPopover(event) {
    let popover = this.popoverCtrl.create(AccountEditPopoverComponent, {
      wallet: this.wallet,
      onDelete: () => {
        this.navCtrl.pop().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      },
      onUndelegate: async () => {
        const pageOptions = await this.operationsProvider.prepareDelegate(this.wallet)
        this.navCtrl.push(pageOptions.page, pageOptions.params).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      }
    })
    popover
      .present({
        ev: event
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  // Tezos
  async isDelegated(): Promise<void> {
    const { isDelegated } = await this.operationsProvider.checkDelegated(this.wallet.receivingPublicAddress)
    this.isKtDelegated = isDelegated
    const action = isDelegated ? this.getStatusAction() : this.getDelegateAction()
    this.replaceAction(ActionType.DELEGATE, action)
  }

  async getKtAddresses() {
    const protocol = new TezosKtProtocol()
    const ktAddresses = await protocol.getAddressesFromPublicKey(this.wallet.publicKey)
    const action = ktAddresses.length > 0 ? this.getStatusAction(ktAddresses) : this.getDelegateAction()
    this.replaceAction(ActionType.DELEGATE, action)
    return ktAddresses
  }

  private replaceAction(type: ActionType, action: CoinAction) {
    const index = this.actions.findIndex(action => action.type === type)
    if (index >= 0) {
      this.actions.splice(index, 1, action)
    }
  }

  private showToast(message: string) {
    let toast = this.toastController.create({
      duration: 3000,
      message: message,
      showCloseButton: true,
      position: 'bottom'
    })
    toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openDelegateSelection(wallet?: AirGapMarketWallet) {
    this.navCtrl
      .push(DelegationBakerDetailPage, {
        wallet: wallet || this.wallet
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openAccountAddPage(subProtocolType: SubProtocolType, wallet: AirGapMarketWallet) {
    this.navCtrl
      .push(SubAccountAddPage, { subProtocolType: subProtocolType, wallet: wallet })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
