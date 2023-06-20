import { IAirGapTransaction } from '@airgap/coinlib-core'
import { implementsInterface } from '@airgap/module-kit'
import { TransactionSignRequest } from '@airgap/serializer'
import { Component, EventEmitter, Input, Output } from '@angular/core'
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms'
import BigNumber from 'bignumber.js'

interface UnsignedTransactionWithGas {
  gasLimit: string
  gasPrice: string
}

@Component({
  selector: 'walletconnect-from-to',
  templateUrl: './walletconnect-from-to.component.html',
  styleUrls: ['./walletconnect-from-to.component.scss']
})
export class WalletconnectFromToComponent {
  public formGroup: UntypedFormGroup | undefined

  @Input()
  public airGapTransaction: IAirGapTransaction | undefined

  @Input()
  public rawTransaction: TransactionSignRequest['transaction'] | undefined

  @Output()
  public readonly onRawTransactionUpdate: EventEmitter<TransactionSignRequest['transaction']> = new EventEmitter<
    TransactionSignRequest['transaction']
  >()

  public constructor(private readonly formBuilder: UntypedFormBuilder) {}

  public advanced: boolean = false

  public async initForms() {
    if (this.hasGas(this.rawTransaction)) {
      const gasLimitValue = this.hexToDecimal(this.rawTransaction.gasLimit)
      const gasPriceValue = new BigNumber(this.hexToDecimal(this.rawTransaction.gasPrice)).shiftedBy(-9).toNumber()

      const gasPriceControl = this.formBuilder.control(gasPriceValue, [Validators.required, Validators.min(0)])
      const gasLimitControl = this.formBuilder.control(gasLimitValue, [Validators.required, Validators.min(0)])

      this.formGroup = this.formBuilder.group({
        gasPrice: gasPriceControl,
        gasLimit: gasLimitControl
      })
    }
  }

  private hexToDecimal(hex: string): number {
    return parseInt(hex, 16)
  }
  private decimalToHex(decimal: number): string {
    return `0x${decimal.toString(16)}`
  }

  public async updateRawTransaction() {
    if (this.hasGas(this.rawTransaction)) {
      const gasPriceValue = this.decimalToHex(new BigNumber(this.formGroup.controls.gasPrice.value).shiftedBy(9).toNumber())

      const rawTransaction: UnsignedTransactionWithGas = {
        ...this.rawTransaction,
        gasPrice: gasPriceValue,
        gasLimit: this.decimalToHex(this.formGroup.controls.gasLimit.value)
      }

      this.rawTransaction = rawTransaction
      this.onRawTransactionUpdate.emit(this.rawTransaction)
      this.advanced = false
    }
  }

  private hasGas(transaction: TransactionSignRequest['transaction']): transaction is UnsignedTransactionWithGas {
    return implementsInterface<UnsignedTransactionWithGas>(transaction, { gasLimit: 'required', gasPrice: 'required' })
  }
}
