import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { IAirGapTransaction, ICoinProtocol } from 'airgap-coin-lib'
import { getProtocolByIdentifierAndNetworkIdentifier } from 'src/app/services/account/account.provider'
import { BrowserService } from 'src/app/services/browser/browser.service'

@Component({
  selector: 'page-transaction-detail',
  templateUrl: 'transaction-detail.html'
})
export class TransactionDetailPage {
  public transaction: IAirGapTransaction
  public lottieConfig: any

  constructor(private readonly route: ActivatedRoute, private readonly browserService: BrowserService) {
    if (this.route.snapshot.data.special) {
      this.transaction = this.route.snapshot.data.special
    }

    this.lottieConfig = {
      path: './assets/animations/pending.json'
    }
  }

  public async openBlockexplorer() {
    const transaction: any = this.transaction
    const hash: string = transaction.hash

    const protocol: ICoinProtocol = getProtocolByIdentifierAndNetworkIdentifier(
      this.transaction.protocolIdentifier,
      this.transaction.network.identifier
    )

    let blockexplorer: string = protocol.options.network.blockExplorer.blockExplorer

    if (hash) {
      blockexplorer = await protocol.getBlockExplorerLinkForTxId(hash)
    } else {
      blockexplorer = await protocol.getBlockExplorerLinkForAddress(
        this.transaction.isInbound ? this.transaction.to[0] : this.transaction.from[0]
      )
    }
    await this.browserService.openUrl(blockexplorer)
  }
}
