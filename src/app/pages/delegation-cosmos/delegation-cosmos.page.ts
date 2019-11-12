import {
  ValidatorService,
  CosmosValidatorInfo
} from "./../../services/validator/validator.service"
import { AirGapCosmosDelegateActionContext } from "./../../models/actions/CosmosDelegateAction"
import { ActivatedRoute, Router } from "@angular/router"
import { Component } from "@angular/core"
import { AirGapMarketWallet, CosmosProtocol } from "airgap-coin-lib"
import {
  ToastController,
  LoadingController,
  AlertController
} from "@ionic/angular"
import { DataService } from "src/app/services/data/data.service"
import BigNumber from "bignumber.js"
import { FormGroup, FormBuilder, Validators } from "@angular/forms"
import { DecimalValidator } from "src/app/validators/DecimalValidator"
import { CosmosDelegation } from "airgap-coin-lib/dist/protocols/cosmos/CosmosNodeClient"

@Component({
  selector: "page-delegation-cosmos",
  templateUrl: "./delegation-cosmos.page.html",
  styleUrls: ["./delegation-cosmos.page.scss"]
})
export class DelegationCosmosPage {
  public wallet: AirGapMarketWallet
  public delegationForm: FormGroup
  public addressDelegated: boolean
  public delegatedAmount: BigNumber
  public validatorAddress: string
  public validatorAlias: string
  public validatorInfo: CosmosValidatorInfo
  public validatorCommission: string | undefined
  public validatorStatus: string | undefined
  public totalDelegationBalance: string | undefined
  public amount: number = 0
  public sendMaxAmount: boolean = false
  public delegationOption: string = "delegate"
  public currentBalance: BigNumber | undefined
  public delegatableBalance: BigNumber
  public delegationReward: BigNumber
  public canDelegate: boolean = true
  public canUndelegate: boolean = true

  private readonly actionCallback: (
    context: AirGapCosmosDelegateActionContext
  ) => void

  constructor(
    private readonly route: ActivatedRoute,
    public formBuilder: FormBuilder,
    public toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly router: Router,
    private readonly validatorService: ValidatorService,
    private readonly dataService: DataService,
    private readonly alertCtrl: AlertController
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.validatorAddress = info.validatorAddress
      console.log("info", info)
      console.log("validatorAddress", this.validatorAddress)

      this.currentBalance = this.wallet.currentBalance
      this.actionCallback = info.actionCallback
      this.delegationForm = formBuilder.group({
        amount: [
          this.amount,
          Validators.compose([
            Validators.required,
            DecimalValidator.validate(this.wallet.coinProtocol.decimals)
          ])
        ]
      })
      this.onChanges()
    }
  }

  public async ionViewDidEnter() {
    await this.checkAddressDelegations()
    await this.getValidatorInfo()
  }

  public onChanges(): void {
    this.delegationForm.get("amount").valueChanges.subscribe(() => {
      this.sendMaxAmount = false
    })
  }

  public async checkAddressDelegations() {
    const protocol = new CosmosProtocol()
    const delegations: CosmosDelegation[] = await protocol.fetchDelegations(
      this.wallet.addresses[0]
    )
    console.log("delegations", delegations)
    console.log("this.validatorAddress", this.validatorAddress)

    const index = delegations.findIndex(
      delegation => delegation.validator_address === this.validatorAddress
    )
    if (index > -1) {
      const delegation = delegations[index]
      this.addressDelegated = true
      const rawDelegatedAmount = new BigNumber(parseFloat(delegation.shares))
      this.delegatedAmount = rawDelegatedAmount
    } else {
      console.log("address is not delegated")
      this.addressDelegated = false
      this.canUndelegate = false
    }
    const totalDelegatedAmount = await this.validatorService.fetchTotalDelegatedAmount(
      this.wallet.addresses[0]
    )
    const rawDelegatableBalance = new BigNumber(
      this.wallet.currentBalance - totalDelegatedAmount.toNumber()
    )
    console.log("rawDelegatableBalance", rawDelegatableBalance)
    this.delegatableBalance = rawDelegatableBalance

    if (this.delegatableBalance.lt(this.wallet.coinProtocol.feeDefaults.low)) {
      this.canDelegate = false
    }
  }

  public async getValidatorInfo() {
    console.log("getValidatorInfo", this.validatorAddress)
    this.validatorInfo = await this.validatorService.getValidatorInfo(
      this.validatorAddress
    )
    this.validatorCommission = this.validatorInfo.rate
    this.validatorAlias = this.validatorInfo.alias
    this.validatorStatus = this.validatorInfo.status
    this.totalDelegationBalance = this.validatorInfo.totalDelegationBalance
    const rawDelegationReward = await this.fetchRewardForDelegation(
      this.wallet.addresses[0],
      this.validatorAddress
    )
    this.delegationReward = rawDelegationReward.shiftedBy(
      -1 * this.wallet.coinProtocol.decimals
    )
  }

  public async delegate(): Promise<void> {
    const { amount: formAmount } = this.delegationForm.value
    const amount = new BigNumber(formAmount).shiftedBy(
      this.wallet.coinProtocol.decimals
    )
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
    const delegatedAmount = new BigNumber(formAmount).shiftedBy(
      this.wallet.coinProtocol.decimals
    )
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
  public async withdrawDelegationRewards(): Promise<void> {
    const protocol = new CosmosProtocol()
    const cosmosTransaction = protocol.withdrawDelegationRewards(
      this.wallet.publicKey,
      [this.validatorAddress]
    )
  }

  public async fetchRewardForDelegation(
    delegatorAddress: string,
    validatorAddress: string
  ): Promise<BigNumber> {
    const protocol = new CosmosProtocol()
    return protocol.fetchRewardForDelegation(delegatorAddress, validatorAddress)
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
      amount = this.wallet.currentBalance.shiftedBy(
        -1 * this.wallet.coinProtocol.decimals
      )
    }
    this.delegationForm.controls.amount.setValue(amount.toFixed(), {
      emitEvent: false
    })
  }
}
