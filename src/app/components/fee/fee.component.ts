import { Component, Input } from '@angular/core'
import { UntypedFormGroup } from '@angular/forms'
import { AirGapMarketWallet, MainProtocolSymbols } from '@airgap/coinlib-core'

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
    this.enableMemo = wallet?.protocol.identifier === MainProtocolSymbols.COSMOS
  }
}
