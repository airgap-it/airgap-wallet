import { ValidatorService, ValidatorInfos } from './../../services/validator/validator.service'
import { AirGapCosmosDelegateActionContext, CosmosDelegationInfo } from './../../models/actions/CosmosDelegateAction'
import { ActivatedRoute, Router } from '@angular/router'
import { Component } from '@angular/core'
import { AirGapMarketWallet, CosmosProtocol } from 'airgap-coin-lib'
import { ToastController, LoadingController } from '@ionic/angular'
import { DataService } from 'src/app/services/data/data.service'
import BigNumber from 'bignumber.js'
import { FormGroup, FormBuilder, Validators } from '@angular/forms'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'

@Component({
  selector: 'page-delegation-cosmos',
  templateUrl: './delegation-cosmos.page.html',
  styleUrls: ['./delegation-cosmos.page.scss']
})
export class DelegationCosmosPage {
  public wallet: AirGapMarketWallet
  public delegationForm: FormGroup
  public addressDelegated: boolean
  public delegatedAmount: BigNumber
  private validatorAddress: string = 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0'
  public validatorInfos: ValidatorInfos
  public validatorCommission: string | undefined
  public validatorStatus: string | undefined
  public totalDelegationBalance: string | undefined
  public amount: number = 0
  public sendMaxAmount: boolean = false

  private readonly actionCallback: (context: AirGapCosmosDelegateActionContext) => void

  constructor(
    private readonly route: ActivatedRoute,
    public formBuilder: FormBuilder,
    public toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly router: Router,
    private readonly validatorService: ValidatorService,
    private readonly dataService: DataService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.actionCallback = info.actionCallback
      this.delegationForm = formBuilder.group({
        amount: [this.amount, Validators.compose([Validators.required, DecimalValidator.validate(this.wallet.coinProtocol.decimals)])]
      })
      this.onChanges()
    }
  }

  public async ionViewDidEnter() {
    await this.isAddressDelegated()
    await this.getValidatorInfos()
  }
  public onChanges(): void {
    this.delegationForm.get('amount').valueChanges.subscribe(() => {
      this.sendMaxAmount = false
    })
  }

  public async isAddressDelegated() {
    const protocol = new CosmosProtocol()
    const delegationInfo: CosmosDelegationInfo = await protocol.isAddressDelegated(this.wallet.addresses[0])
    if (delegationInfo.isDelegated) {
      this.addressDelegated = true
      this.validatorAddress = delegationInfo.delegationInfo[0].validator_address // TODO what if we're delegated to multiple validators

      this.delegatedAmount = new BigNumber(
        parseFloat(delegationInfo.delegationInfo.find(delegation => (delegation.validator_address = this.validatorAddress)).shares)
      ).shiftedBy(-1 * this.wallet.coinProtocol.decimals)
      this.delegationForm.controls.amount.setValue(this.delegatedAmount.toFixed(), {
        emitEvent: false
      })
    } else {
      this.addressDelegated = false
    }
  }

  public async getValidatorInfos() {
    this.validatorInfos = await this.validatorService.getValidatorInfos(this.validatorAddress)
    this.validatorCommission = this.validatorInfos.rate
    this.validatorStatus = this.validatorInfos.status
    this.totalDelegationBalance = this.validatorInfos.totalDelegationBalance
  }

  public async delegate(): Promise<void> {
    const { amount: formAmount } = this.delegationForm.value
    const amount = new BigNumber(formAmount).shiftedBy(this.wallet.coinProtocol.decimals)
    this.actionCallback({
      wallet: this.wallet,
      validatorAddress: this.validatorAddress,
      amount: amount,
      undelegate: false,
      toastController: this.toastController,
      loadingController: this.loadingController,
      dataService: this.dataService,
      router: this.router
    })
  }

  public async undelegate(): Promise<void> {
    const { amount: formAmount } = this.delegationForm.value
    const delegatedAmount = new BigNumber(formAmount).shiftedBy(this.wallet.coinProtocol.decimals)
    this.actionCallback({
      wallet: this.wallet,
      validatorAddress: this.validatorAddress,
      amount: delegatedAmount,
      undelegate: true,
      toastController: this.toastController,
      loadingController: this.loadingController,
      dataService: this.dataService,
      router: this.router
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
    if (this.isAddressDelegated) {
      amount = this.delegatedAmount
    } else {
      amount = this.wallet.currentBalance.shiftedBy(-1 * this.wallet.coinProtocol.decimals)
    }
    this.delegationForm.controls.amount.setValue(amount.toFixed(), {
      emitEvent: false
    })
  }
}
