import { Component, EventEmitter, Input, Output } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { BigNumber } from 'bignumber.js'

import { DecimalValidator } from '../../validators/DecimalValidator'

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
  public wallet?: AirGapMarketWallet

  @Input()
  public capMaxAmount: BigNumber

  @Input()
  public disabled: boolean = false

  @Output()
  public readonly amountEmitter: EventEmitter<BigNumber> = new EventEmitter<BigNumber>()

  constructor(public formBuilder: FormBuilder) {
    this.delegationForm = this.formBuilder.group({
      amount: [this.amount, Validators.compose([Validators.required])]
    })
    this.onChanges()
  }

  public IonViewDidEnter() {
    this.delegationForm = this.formBuilder.group({
      amount: [this.amount, Validators.compose([Validators.required, DecimalValidator.validate(this.wallet.protocol.decimals)])]
    })
  }
  public toggleMaxAmount() {
    this.sendMaxAmount = !this.sendMaxAmount
    if (this.sendMaxAmount) {
      this.setMaxAmount()
    }
  }

  public onChanges(): void {
    this.delegationForm.valueChanges.subscribe((val: any) => {
      if (val && val.amount) {
        this.amountEmitter.emit(new BigNumber(val.amount).shiftedBy(this.wallet.protocol.decimals))
      }
    })
  }

  private setMaxAmount() {
    let amount
    if (this.capMaxAmount) {
      amount = this.capMaxAmount.shiftedBy(-1 * this.wallet.protocol.decimals).toNumber()
    } else {
      amount = this.wallet
        .getCurrentBalance()
        .shiftedBy(-1 * this.wallet.protocol.decimals)
        .toNumber()
    }
    this.delegationForm.controls.amount.setValue(amount, {
      emitEvent: true
    })
  }
}
