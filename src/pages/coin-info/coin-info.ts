import { Component } from '@angular/core'
import { IAirGapTransaction, AirGapMarketWallet } from 'airgap-coin-lib'
import { NavController, NavParams, PopoverController } from 'ionic-angular'

import { TransactionDetailPage } from '../transaction-detail/transaction-detail'
import { TransactionPreparePage } from '../transaction-prepare/transaction-prepare'
import { WalletAddressPage } from '../wallet-address/wallet-address'
import { WalletEditPopoverComponent } from '../../components/wallet-edit-popover/wallet-edit-popover.component'
import { WalletsProvider } from '../../providers/wallets/wallets.provider'

@Component({
  selector: 'page-coin-info',
  templateUrl: 'coin-info.html'
})
export class CoinInfoPage {
  isRefreshing = true
  wallet: AirGapMarketWallet
  transactions: IAirGapTransaction[] = []

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public popoverCtrl: PopoverController,
    public walletProvider: WalletsProvider
  ) {
    this.wallet = this.navParams.get('wallet')
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

  doRefresh(refresher: any = null) {
    this.isRefreshing = true
    Promise.all([this.wallet.fetchTransactions(50, 0), this.wallet.synchronize()]).then(results => {
      this.transactions = results[0]

      if (refresher) {
        refresher.complete()
      }

      this.isRefreshing = false
      this.walletProvider.triggerWalletChanged()
    })
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
