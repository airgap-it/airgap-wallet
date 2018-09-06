import { Component } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'

import { Transaction } from '../../models/transaction.model'

declare let cordova

@Component({
  selector: 'page-transaction-detail',
  templateUrl: 'transaction-detail.html'
})
export class TransactionDetailPage {

  public transaction: Transaction

  constructor(
    public navController: NavController,
    public navParams: NavParams,
    private platform: Platform
  ) {
    this.transaction = this.navParams.get('transaction')
    console.log(this.transaction)
  }

  openBlockexplorer() {
    let transaction: any = this.transaction
    let hash = transaction.hash
    let blockexplorer = '' // TODO: Move to coinlib
    if (this.transaction.protocolIdentifier === 'btc') {
      blockexplorer = 'https://live.blockcypher.com/btc/tx/{{txId}}/'
    } else if (this.transaction.protocolIdentifier === 'eth') {
      blockexplorer = 'https://etherscan.io/tx/{{txId}}'
    } else if (this.transaction.protocolIdentifier === 'eth-erc20-ae') {
      blockexplorer = 'https://etherscan.io/tx/{{txId}}'
    }

    if (hash && blockexplorer) {
      this.openUrl(blockexplorer.replace('{{txId}}', hash))
    }
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }
}
