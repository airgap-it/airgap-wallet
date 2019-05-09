import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Platform } from '@ionic/angular'
import { getProtocolByIdentifier } from 'airgap-coin-lib'

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
    const hash = transaction.hash

    const protocol = getProtocolByIdentifier(this.transaction.protocolIdentifier)

    if (hash) {
      const blockexplorer = protocol.getBlockExplorerLinkForTxId(hash)

      this.openUrl(blockexplorer)
    } else {
      // TODO: Remove AE specific code, but add an alert that there was an error.
      if (this.transaction.protocolIdentifier.startsWith('ae')) {
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
