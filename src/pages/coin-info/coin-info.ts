import { Component } from '@angular/core'
import { IAirGapTransaction, AirGapMarketWallet } from 'airgap-coin-lib'
import { Platform, NavController, NavParams, PopoverController } from 'ionic-angular'

import { TransactionDetailPage } from '../transaction-detail/transaction-detail'
import { TransactionPreparePage } from '../transaction-prepare/transaction-prepare'
import { WalletAddressPage } from '../wallet-address/wallet-address'
import { WalletEditPopoverComponent } from '../../components/wallet-edit-popover/wallet-edit-popover.component'
import { WalletsProvider } from '../../providers/wallets/wallets.provider'
import { HttpClient } from '@angular/common/http'
import { BigNumber } from 'bignumber.js'

declare let cordova

@Component({
  selector: 'page-coin-info',
  templateUrl: 'coin-info.html'
})
export class CoinInfoPage {
  isRefreshing = true
  wallet: AirGapMarketWallet
  transactions: IAirGapTransaction[] = []

  protocolIdentifier: string
  aeTxEnabled: boolean = false
  aeTxListEnabled: boolean = false
  aeMigratedTokens: BigNumber = new BigNumber(0)
  aeCurrentPhase: string = ''
  aePhaseEnd: string = ''

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public popoverCtrl: PopoverController,
    public walletProvider: WalletsProvider,
    public http: HttpClient,
    private platform: Platform
  ) {
    this.wallet = this.navParams.get('wallet')
    this.protocolIdentifier = this.wallet.coinProtocol.identifier
    if (this.protocolIdentifier === 'ae') {
      this.http
        .get(`http://ae-epoch-rpc-proxy.gke.papers.tech/api/v1/protocol/ae/migrations/pending/${this.wallet.addresses[0]}`)
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

  ionViewDidEnter() {
    this.doRefresh()
  }

  openPreparePage() {
    this.navCtrl.push(TransactionPreparePage, {
      wallet: this.wallet
    })
  }

  openReceivePage() {
    this.navCtrl.push(WalletAddressPage, {
      wallet: this.wallet
    })
  }

  openTransactionDetailPage(transaction: IAirGapTransaction) {
    this.navCtrl.push(TransactionDetailPage, {
      transaction: transaction
    })
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

    // this can safely be removed after AE has made the switch to mainnet
    if (this.protocolIdentifier === 'ae') {
      this.http.get('http://ae-epoch-rpc-proxy.gke.papers.tech/status').subscribe((result: any) => {
        this.aeTxEnabled = result.transactionsEnabled
        this.aeTxListEnabled = result.txListEnabled
        if (this.aeTxListEnabled) {
          Promise.all([this.wallet.fetchTransactions(50, 0), this.wallet.synchronize()]).then(results => {
            this.transactions = results[0]

            this.isRefreshing = false
            this.walletProvider.triggerWalletChanged()
          })
        } else {
          this.transactions = []
          this.isRefreshing = false
        }
        if (refresher) {
          refresher.complete()
        }
      })
    } else {
      Promise.all([this.wallet.fetchTransactions(50, 0), this.wallet.synchronize()]).then(results => {
        this.transactions = results[0]

        if (refresher) {
          refresher.complete()
        }

        this.isRefreshing = false
        this.walletProvider.triggerWalletChanged()
      })
    }
  }

  presentEditPopover(event) {
    let popover = this.popoverCtrl.create(WalletEditPopoverComponent, {
      wallet: this.wallet,
      onDelete: () => {
        this.navCtrl.pop()
      }
    })
    popover.present({
      ev: event
    })
  }
}
