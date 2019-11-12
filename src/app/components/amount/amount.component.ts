import { BigNumber } from 'bignumber.js'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { FormGroup, FormBuilder, Validators } from '@angular/forms'
import { Component, Input } from '@angular/core'
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

  constructor(public formBuilder: FormBuilder) {
    this.delegationForm = this.formBuilder.group({
      amount: [this.amount, Validators.compose([Validators.required])]
    })
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

  private setMaxAmount() {
    let amount
    if (this.capMaxAmount) {
      amount = this.capMaxAmount.shiftedBy(-1 * this.wallet.coinProtocol.decimals)
    } else {
      amount = this.wallet.currentBalance.shiftedBy(-1 * this.wallet.coinProtocol.decimals)
    }
    this.delegationForm.controls.amount.setValue(amount, {
      emitEvent: false
    })
  }
}
