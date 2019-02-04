import { Component } from '@angular/core'
import { IAirGapTransaction, AirGapMarketWallet } from 'airgap-coin-lib'
import { Platform, NavController, NavParams, PopoverController } from 'ionic-angular'

import { TransactionDetailPage } from '../transaction-detail/transaction-detail'
import { TransactionPreparePage } from '../transaction-prepare/transaction-prepare'
import { AccountEditPopoverComponent } from '../../components/account-edit-popover/account-edit-popover.component'
import { AccountProvider } from '../../providers/account/account.provider'
import { HttpClient } from '@angular/common/http'
import { BigNumber } from 'bignumber.js'
import { StorageProvider } from '../../providers/storage/storage'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { AccountAddressPage } from '../account-address/account-address'

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

  // AE-Migration Stuff
  aeTxEnabled: boolean = false
  aeTxListEnabled: boolean = false
  aeMigratedTokens: BigNumber = new BigNumber(0)
  aeCurrentPhase: string = ''
  aePhaseEnd: string = ''

  lottieConfig = {
    path: '/assets/animations/loading.json'
  }

  private TRANSACTION_LIMIT = 10

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public popoverCtrl: PopoverController,
    public walletProvider: AccountProvider,
    public http: HttpClient,
    private platform: Platform,
    private storageProvider: StorageProvider
  ) {
    this.wallet = this.navParams.get('wallet')
    this.protocolIdentifier = this.wallet.coinProtocol.identifier
    if (this.protocolIdentifier === 'ae') {
      this.http
        .get(`https://api-airgap.gke.papers.tech/api/v1/protocol/ae/migrations/pending/${this.wallet.addresses[0]}`)
        .subscribe((result: any) => {
          this.aeMigratedTokens = new BigNumber(result.phase.balance)
          this.aeCurrentPhase = result.phase.name
          this.aePhaseEnd = result.phase.endTimestamp
        })
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
    return this.wallet.protocolIdentifier === 'ae'
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
    this.openUrl(`https://explorer.aepps.com/#/account/${this.wallet.addresses[0]}`)
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

  doRefresh(refresher: any = null) {
    this.isRefreshing = true

    if (refresher) {
      refresher.complete()
    }

    // this can safely be removed after AE has made the switch to mainnet
    if (this.protocolIdentifier === 'ae') {
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

    await this.storageProvider.setCache<IAirGapTransaction[]>(this.getWalletIdentifier(), this.transactions)

    if (newTransactions.length < this.TRANSACTION_LIMIT) {
      this.infiniteEnabled = false
    }

    infiniteScroll.complete()
  }

  async loadInitialTransactions(): Promise<void> {
    if (this.transactions.length === 0) {
      this.transactions = (await this.storageProvider.getCache<IAirGapTransaction[]>(this.getWalletIdentifier())) || []
    }

    const transactions = await this.getTransactions()

    this.transactions = this.mergeTransactions(this.transactions, transactions)

    this.isRefreshing = false
    this.initialTransactionsLoaded = true

    this.walletProvider.triggerWalletChanged()
    await this.storageProvider.setCache<IAirGapTransaction[]>(this.getWalletIdentifier(), this.transactions)
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

  getWalletIdentifier(): string {
    return `${this.wallet.protocolIdentifier}-${this.wallet.publicKey}`
  }

  presentEditPopover(event) {
    let popover = this.popoverCtrl.create(AccountEditPopoverComponent, {
      wallet: this.wallet,
      onDelete: () => {
        this.navCtrl.pop().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      }
    })
    popover
      .present({
        ev: event
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
