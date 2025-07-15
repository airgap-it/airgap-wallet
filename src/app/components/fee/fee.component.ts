import { Component, Input } from '@angular/core'
import { UntypedFormGroup } from '@angular/forms'
import { AirGapMarketWallet, MainProtocolSymbols, SubProtocolSymbols } from '@airgap/coinlib-core'

@Component({
  selector: 'fee',
  templateUrl: './fee.component.html',
  styleUrls: ['./fee.component.scss']
})
export class FeeComponent {
  public _wallet: AirGapMarketWallet | undefined
  public enableMemo: boolean = false

  @Input()
  public set wallet(value: AirGapMarketWallet) {
    this._wallet = value
    this.checkEnableMemo(value)
  }

  @Input()
  public state: any

  @Input()
  public form: UntypedFormGroup

  public constructor() {}

  private checkEnableMemo(wallet: AirGapMarketWallet) {
    console.log('wallet?.protocol.identifier', wallet?.protocol.identifier)
    this.enableMemo =
      wallet?.protocol.identifier === MainProtocolSymbols.COSMOS ||
      wallet?.protocol.identifier === MainProtocolSymbols.STELLAR ||
      wallet?.protocol.identifier.startsWith(SubProtocolSymbols.STELLAR_ASSET)
  }
}
