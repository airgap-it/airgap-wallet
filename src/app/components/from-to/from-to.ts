import { AfterViewInit, Component, Input } from '@angular/core'
import { IAirGapTransaction } from 'airgap-coin-lib'
import { NetworkType } from 'airgap-coin-lib/dist/utils/ProtocolNetwork'

@Component({
  selector: 'from-to',
  templateUrl: 'from-to.html',
  styleUrls: ['./from-to.scss']
})
export class FromToComponent implements AfterViewInit {
  @Input()
  public transaction: IAirGapTransaction

  public displayRawData: boolean = false

  public readonly networkType: typeof NetworkType = NetworkType
  public networkInfo: {
    type: NetworkType
    name: string
    rpcUrl: string
  }

  public ngAfterViewInit(): void {
    this.networkInfo = this.getNetworkInfo(this.transaction.networkIdentifier)
  }

  private getNetworkInfo(
    networkIdentifier: string
  ): {
    type: NetworkType
    name: string
    rpcUrl: string
  } {
    const splits: string[] = networkIdentifier.split('-')

    return {
      type: splits[0] as NetworkType,
      name: splits[1],
      rpcUrl: splits[2]
    }
  }
}
