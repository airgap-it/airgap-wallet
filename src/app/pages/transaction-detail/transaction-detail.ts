import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Platform } from '@ionic/angular'
import { getProtocolByIdentifier, ICoinProtocol } from 'airgap-coin-lib'

import { Transaction } from '../../models/transaction.model'

declare let cordova

@Component({
  selector: 'page-transaction-detail',
  templateUrl: 'transaction-detail.html'
})
export class TransactionDetailPage {
  public transaction: Transaction
  public lottieConfig: any

  constructor(private readonly platform: Platform, private readonly route: ActivatedRoute) {
    if (this.route.snapshot.data.special) {
      this.transaction = this.route.snapshot.data.special
    }

    this.lottieConfig = {
      path: '/assets/animations/pending.json'
    }
  }

  public openBlockexplorer() {
    const transaction: any = this.transaction
    const hash: string = transaction.hash

    const protocol: ICoinProtocol = getProtocolByIdentifier(this.transaction.protocolIdentifier)

    let blockexplorer: string = protocol.blockExplorer

    if (hash) {
      blockexplorer = protocol.getBlockExplorerLinkForTxId(hash)
    } else {
      blockexplorer = protocol.getBlockExplorerLinkForAddress(
        this.transaction.isInbound ? this.transaction.to[0] : this.transaction.from[0]
      )
    }
    this.openUrl(blockexplorer)
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }
}
