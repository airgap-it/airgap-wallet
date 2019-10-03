import { ValidatorService, CosmosValidatorInfo } from './../../services/validator/validator.service'
import { AirGapCosmosDelegateActionContext } from './../../models/actions/CosmosDelegateAction'
import { ActivatedRoute, Router } from '@angular/router'
import { Component } from '@angular/core'
import { AirGapMarketWallet, CosmosProtocol } from 'airgap-coin-lib'
import { ToastController, LoadingController } from '@ionic/angular'
import { DataService } from 'src/app/services/data/data.service'
import BigNumber from 'bignumber.js'
import { FormGroup, FormBuilder, Validators } from '@angular/forms'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'
import { CosmosDelegation } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosNodeClient'

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
  public validatorAddress: string = 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0'
  public validatorAlias: string
  public validatorInfo: CosmosValidatorInfo
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
    await this.checkAddressDelegations()
    await this.getValidatorInfo()
  }

  public onChanges(): void {
    this.delegationForm.get('amount').valueChanges.subscribe(() => {
      this.sendMaxAmount = false
    })
  }

  public async checkAddressDelegations() {
    const protocol = new CosmosProtocol()
    const delegations: CosmosDelegation[] = await protocol.fetchDelegations(this.wallet.addresses[0])
    if (delegations.length > 0) {
      const delegation = delegations[0] // TODO what if we're delegated to multiple validators
      this.addressDelegated = true
      this.validatorAddress = delegation.validator_address

      this.delegatedAmount = new BigNumber(parseFloat(delegation.shares)).shiftedBy(-1 * this.wallet.coinProtocol.decimals)
      this.delegationForm.controls.amount.setValue(this.delegatedAmount.toFixed(), {
        emitEvent: false
      })
    } else {
      this.addressDelegated = false
    }
  }

  public async getValidatorInfo() {
    this.validatorInfo = await this.validatorService.getValidatorInfo(this.validatorAddress)
    this.validatorCommission = this.validatorInfo.rate
    this.validatorAlias = this.validatorInfo.alias
    this.validatorStatus = this.validatorInfo.status
    this.totalDelegationBalance = this.validatorInfo.totalDelegationBalance
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
    if (this.addressDelegated) {
      amount = this.delegatedAmount
    } else {
      amount = this.wallet.currentBalance.shiftedBy(-1 * this.wallet.coinProtocol.decimals)
    }
    this.delegationForm.controls.amount.setValue(amount.toFixed(), {
      emitEvent: false
    })
  }
}
