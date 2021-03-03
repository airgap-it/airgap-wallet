import { Component, OnInit } from '@angular/core'
import { ProtocolService } from '@airgap/angular-core'
import { ActivatedRoute } from '@angular/router'
import { IAirGapTransaction, ICoinProtocol } from '@airgap/coinlib-core'
import { BrowserService } from 'src/app/services/browser/browser.service'
import { DataService } from 'src/app/services/data/data.service'

@Component({
  selector: 'page-transaction-detail',
  templateUrl: 'transaction-detail.html'
})
export class TransactionDetailPage implements OnInit {
  public transaction: IAirGapTransaction
  public lottieConfig: any

  constructor(
    private readonly route: ActivatedRoute,
    public readonly dataService: DataService,
    private readonly browserService: BrowserService,
    private readonly protocolService: ProtocolService
  ) {
    if (this.route.snapshot.data.special) {
      this.transaction = this.route.snapshot.data.special
    }

    this.lottieConfig = {
      path: './assets/animations/pending.json'
    }
  }
  public async ngOnInit(): Promise<void> {
    if (!this.route.snapshot.data.special) {
      const hash = this.route.snapshot.params.hash
      this.transaction = await this.dataService.get(hash)
    }
  }

  public async openBlockexplorer() {
    const transaction: any = this.transaction
    const hash: string = transaction.hash

    const protocol: ICoinProtocol = await this.protocolService.getProtocol(this.transaction.protocolIdentifier, this.transaction.network)
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
