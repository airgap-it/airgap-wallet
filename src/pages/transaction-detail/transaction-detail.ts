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
  lottieConfig: any

  constructor(public navController: NavController, public navParams: NavParams, private platform: Platform) {
    this.transaction = this.navParams.get('transaction')
    this.lottieConfig = {
      path: '/assets/animations/pending.json'
    }
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
    } else if (this.transaction.protocolIdentifier === 'ae') {
      blockexplorer = 'https://explorer.aepps.com/#/tx/{{txId}}'
    } else if (this.transaction.protocolIdentifier === 'xtz') {
      blockexplorer = 'https://tzscan.io/{{txId}}'
    }

    if (hash && blockexplorer) {
      this.openUrl(blockexplorer.replace('{{txId}}', hash))
    } else {
      // TODO: Remove AE specific code, but add an alert that there was an error.
      if (this.transaction.protocolIdentifier === 'ae') {
        this.openUrl(`https://explorer.aepps.com/#/account/${this.transaction.isInbound ? this.transaction.to : this.transaction.from}`)
      }
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
