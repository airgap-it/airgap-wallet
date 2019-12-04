import { Component } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingController, ToastController } from '@ionic/angular'
import { AirGapMarketWallet, CosmosProtocol, IAirGapTransaction } from 'airgap-coin-lib'
import { CosmosDelegation } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosNodeClient'
import { CosmosTransaction } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosTransaction'
import BigNumber from 'bignumber.js'

import { AirGapCosmosDelegateAction } from '../../models/actions/CosmosDelegateAction'
import { DataService } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { DecimalValidator } from '../../validators/DecimalValidator'

import { DataServiceKey } from './../../services/data/data.service'
import { OperationsProvider } from './../../services/operations/operations'
import { CosmosValidatorInfo, ValidatorService } from './../../services/validator/validator.service'

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
  public totalDelegatedAmount: BigNumber
  public validatorAddress: string
  public validatorAlias: string
  public validatorInfo: CosmosValidatorInfo
  public validatorCommission: string | undefined
  public validatorStatus: string | undefined
  public totalDelegationBalance: BigNumber | undefined
  public selfDelegationBalance: BigNumber
  public amount: BigNumber = new BigNumber(0)
  public percentage: string | undefined
  public votingPower: BigNumber | undefined

  public sendMaxAmount: boolean = false
  public delegationOption: string = 'delegate'
  public currentBalance: BigNumber | undefined
  public delegatableBalance: BigNumber
  public delegationReward: BigNumber
  public canDelegate: boolean = true
  public canUndelegate: boolean = true

  constructor(
    private readonly route: ActivatedRoute,
    public formBuilder: FormBuilder,
    public toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly router: Router,
    private readonly validatorService: ValidatorService,
    private readonly dataService: DataService,
    private readonly operationsProvider: OperationsProvider
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.validatorAddress = info.validatorAddress
      this.currentBalance = this.wallet.currentBalance
      this.delegationForm = formBuilder.group({
        amount: [this.amount, Validators.compose([Validators.required, DecimalValidator.validate(this.wallet.coinProtocol.decimals)])]
      })
      this.onChanges()
    }
  }

  public async ionViewDidEnter(): Promise<void> {
    await this.checkAddressDelegations()
    await this.getValidatorInfo()
  }

  public onChanges(): void {
    this.delegationForm.get('amount').valueChanges.subscribe(() => {
      this.sendMaxAmount = false
    })
  }

  public async checkAddressDelegations(): Promise<void> {
    const address: string = this.wallet.addresses[0]
    const protocol: CosmosProtocol = new CosmosProtocol()
    const delegations: CosmosDelegation[] = await protocol.fetchDelegations(address)
    const index: number = delegations.findIndex((delegation: CosmosDelegation) => delegation.validator_address === this.validatorAddress)
    if (index > -1) {
      const delegation: CosmosDelegation = delegations[index]
      this.addressDelegated = true
      const rawDelegatedAmount: BigNumber = new BigNumber(parseFloat(delegation.shares))
      this.delegatedAmount = rawDelegatedAmount
    } else {
      this.addressDelegated = false
      this.canUndelegate = false
    }
    this.totalDelegatedAmount = await this.validatorService.fetchTotalDelegatedAmount(address)
    this.votingPower = await this.validatorService.fetchVotingPower(this.validatorAddress)
    const rawDelegatableBalance: BigNumber = new BigNumber(this.wallet.currentBalance - this.totalDelegatedAmount.toNumber())
    this.delegatableBalance = rawDelegatableBalance

    if (this.delegatableBalance.lt(this.wallet.coinProtocol.feeDefaults.low)) {
      this.canDelegate = false
    }
  }

  public async getValidatorInfo(): Promise<void> {
    this.selfDelegationBalance = await this.validatorService.fetchSelfDelegation(this.validatorAddress)

    this.validatorInfo = await this.validatorService.getValidatorInfo(this.validatorAddress)
    this.validatorCommission = this.validatorInfo.rate
    this.validatorAlias = this.validatorInfo.alias
    this.validatorStatus = this.validatorInfo.status
    this.totalDelegationBalance = this.validatorInfo.totalDelegationBalance
    this.percentage = `${this.selfDelegationBalance
      .div(this.totalDelegationBalance)
      .times(100)
      .toFixed(2)}%`
    const rawDelegationReward: BigNumber = await this.fetchRewardForDelegation(this.wallet.addresses[0], this.validatorAddress)
    this.delegationReward = rawDelegationReward.shiftedBy(-1 * this.wallet.coinProtocol.decimals)
  }

  public async delegate(): Promise<void> {
    const delegateAction: AirGapCosmosDelegateAction = new AirGapCosmosDelegateAction({
      toastController: this.toastController,
      loadingController: this.loadingController,
      dataService: this.dataService,
      router: this.router,
      wallet: this.wallet,
      validatorAddress: this.validatorAddress,
      amount: this.amount,
      undelegate: false
    })

    await delegateAction.start()
  }

  public async undelegate(): Promise<void> {
    const delegateAction: AirGapCosmosDelegateAction = new AirGapCosmosDelegateAction({
      toastController: this.toastController,
      loadingController: this.loadingController,
      dataService: this.dataService,
      router: this.router,
      wallet: this.wallet,
      validatorAddress: this.validatorAddress,
      amount: this.amount,
      undelegate: false
    })

    await delegateAction.start()
  }

  public async withdrawDelegationRewards(): Promise<void> {
    const protocol: CosmosProtocol = new CosmosProtocol()
    const cosmosTransaction: CosmosTransaction = await protocol.withdrawDelegationRewards(this.wallet.publicKey, [this.validatorAddress])

    this.serializeAndNavigate(cosmosTransaction)
  }

  public async serializeAndNavigate(cosmosTransaction: CosmosTransaction): Promise<void> {
    const serializedTxs: string[] = await this.operationsProvider.serializeTx(this.wallet, cosmosTransaction)

    const airGapTxs: IAirGapTransaction[] = cosmosTransaction.toAirGapTransactions('cosmos')
    const info = {
      wallet: this.wallet,
      airGapTxs,
      data: serializedTxs
    }
    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async fetchRewardForDelegation(delegatorAddress: string, validatorAddress: string): Promise<BigNumber> {
    const protocol: CosmosProtocol = new CosmosProtocol()

    return protocol.fetchRewardForDelegation(delegatorAddress, validatorAddress)
  }

  public setFormAmount(amount: BigNumber): void {
    this.amount = amount
  }
}
