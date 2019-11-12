import { BigNumber } from 'bignumber.js'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { FormGroup, FormBuilder, Validators } from '@angular/forms'
import { Component, Input, EventEmitter, Output } from '@angular/core'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'

@Component({
  selector: 'amount',
  templateUrl: './amount.component.html',
  styleUrls: ['./amount.component.scss']
})
export class AmountComponent {
  public delegationForm: FormGroup
  public amount: number = 0
  public sendMaxAmount: boolean = false
  public amountControl
  @Input()
  public wallet: AirGapMarketWallet

  @Input()
  public capMaxAmount: BigNumber

  @Input()
  public disabled: boolean = false

  @Output()
  public amountEmitter: EventEmitter<BigNumber> = new EventEmitter<BigNumber>()

  constructor(public formBuilder: FormBuilder) {
    this.delegationForm = this.formBuilder.group({
      amount: [this.amount, Validators.compose([Validators.required])]
    })
    this.onChanges()
  }

  public IonViewDidEnter() {
    this.delegationForm = this.formBuilder.group({
      amount: [this.amount, Validators.compose([Validators.required, DecimalValidator.validate(this.wallet.coinProtocol.decimals)])]
    })
  }
  public toggleMaxAmount() {
    this.sendMaxAmount = !this.sendMaxAmount
    if (this.sendMaxAmount) {
      this.setMaxAmount()
    }
  }

  onChanges(): void {
    this.delegationForm.valueChanges.subscribe((val: any) => {
      if (val && val.amount) {
        this.amountEmitter.emit(new BigNumber(val.amount).shiftedBy(this.wallet.coinProtocol.decimals))
      }
    })
  }

  private setMaxAmount() {
    let amount
    if (this.capMaxAmount) {
      amount = this.capMaxAmount.shiftedBy(-1 * this.wallet.coinProtocol.decimals).toNumber()
    } else {
      amount = this.wallet.currentBalance.shiftedBy(-1 * this.wallet.coinProtocol.decimals).toNumber()
    }
    this.delegationForm.controls.amount.setValue(amount, {
      emitEvent: true
    })
  }
}
