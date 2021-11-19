import { Component, Input, Output, EventEmitter } from '@angular/core'
import { IAirGapTransaction, RawEthereumTransaction } from '@airgap/coinlib-core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import BigNumber from 'bignumber.js'

@Component({
  selector: 'walletconnect-from-to',
  templateUrl: './walletconnect-from-to.component.html',
  styleUrls: ['./walletconnect-from-to.component.scss']
})
export class WalletconnectFromToComponent {
  public formGroup: FormGroup | undefined

  @Input()
  public airGapTransaction: IAirGapTransaction | undefined

  @Input()
  public rawTransaction: RawEthereumTransaction | undefined

  @Output()
  public readonly onRawTransactionUpdate: EventEmitter<RawEthereumTransaction> = new EventEmitter<RawEthereumTransaction>()

  constructor(private readonly formBuilder: FormBuilder) {}

  public advanced: boolean = false

  public async initForms() {
    const gasLimitValue = this.hexToDecimal(this.rawTransaction.gasLimit)
    const gasPriceValue = new BigNumber(this.hexToDecimal(this.rawTransaction.gasPrice)).shiftedBy(-9).toNumber()

    const gasPriceControl = this.formBuilder.control(gasPriceValue, [Validators.required, Validators.min(0)])
    const gasLimitControl = this.formBuilder.control(gasLimitValue, [Validators.required, Validators.min(0)])

    this.formGroup = this.formBuilder.group({
      gasPrice: gasPriceControl,
      gasLimit: gasLimitControl
    })
  }

  private hexToDecimal(hex: string): number {
    return parseInt(hex, 16)
  }
  private decimalToHex(decimal: number): string {
    return `0x${decimal.toString(16)}`
  }

  public async updateRawTransaction() {
    const gasPriceValue = this.decimalToHex(new BigNumber(this.formGroup.controls.gasPrice.value).shiftedBy(9).toNumber())

    this.rawTransaction = {
      ...this.rawTransaction,
      gasPrice: gasPriceValue,
      gasLimit: this.decimalToHex(this.formGroup.controls.gasLimit.value)
    }
    this.onRawTransactionUpdate.emit(this.rawTransaction)
    this.advanced = false
  }
}
