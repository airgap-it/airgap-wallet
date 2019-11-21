import { Component } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { AlertController, LoadingController, ToastController } from '@ionic/angular'
import {
  AirGapMarketWallet,
  CosmosProtocol,
  IACMessageDefinitionObject,
  IACMessageType,
  Serializer,
  UnsignedCosmosTransaction
} from 'airgap-coin-lib'
import { CosmosDelegation } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosNodeClient'
import { CosmosTransaction } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosTransaction'
import BigNumber from 'bignumber.js'
import { DataService } from 'src/app/services/data/data.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'
import { AirGapCosmosDelegateActionContext } from './../../models/actions/CosmosDelegateAction'
import { DataServiceKey } from './../../services/data/data.service'
import { OperationsProvider } from './../../services/operations/operations'
import { ProtocolSymbols } from './../../services/protocols/protocols'
import { CosmosValidatorInfo, ValidatorService } from './../../services/validator/validator.service'
import { serializedDataToUrlString } from '../../utils/utils'

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

  private readonly actionCallback: (context: AirGapCosmosDelegateActionContext) => void

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
    const address = this.wallet.addresses[0]
    const protocol = new CosmosProtocol()
    const delegations: CosmosDelegation[] = await protocol.fetchDelegations(address)
    const index = delegations.findIndex(delegation => delegation.validator_address === this.validatorAddress)
    if (index > -1) {
      const delegation = delegations[index]
      this.addressDelegated = true
      const rawDelegatedAmount = new BigNumber(parseFloat(delegation.shares))
      this.delegatedAmount = rawDelegatedAmount
    } else {
      this.addressDelegated = false
      this.canUndelegate = false
    }
    this.totalDelegatedAmount = await this.validatorService.fetchTotalDelegatedAmount(address)
    this.votingPower = await this.validatorService.fetchVotingPower(this.validatorAddress)
    const rawDelegatableBalance = new BigNumber(this.wallet.currentBalance - this.totalDelegatedAmount.toNumber())
    this.delegatableBalance = rawDelegatableBalance

    if (this.delegatableBalance.lt(this.wallet.coinProtocol.feeDefaults.low)) {
      this.canDelegate = false
    }
  }

  public async getValidatorInfo() {
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
    const rawDelegationReward = await this.fetchRewardForDelegation(this.wallet.addresses[0], this.validatorAddress)
    this.delegationReward = rawDelegationReward.shiftedBy(-1 * this.wallet.coinProtocol.decimals)
  }

  public async delegate(): Promise<void> {
    this.actionCallback({
      wallet: this.wallet,
      validatorAddress: this.validatorAddress,
      amount: this.amount,
      undelegate: false,
      toastController: this.toastController,
      loadingController: this.loadingController,
      dataService: this.dataService,
      router: this.router
    })
  }

  public async undelegate(): Promise<void> {
    this.actionCallback({
      wallet: this.wallet,
      validatorAddress: this.validatorAddress,
      amount: this.amount,
      undelegate: true,
      toastController: this.toastController,
      loadingController: this.loadingController,
      dataService: this.dataService,
      router: this.router
    })
  }
  public async withdrawDelegationRewards(): Promise<void> {
    console.log('withdrawDelegationRewards')

    const protocol = new CosmosProtocol()
    const cosmosTransaction: CosmosTransaction = await protocol.withdrawDelegationRewards(this.wallet.publicKey, [this.validatorAddress])
    console.log('cosmosTransaction', cosmosTransaction)
    const serializer: Serializer = new Serializer()

    const unsignedCosmosTx: UnsignedCosmosTransaction = {
      publicKey: this.wallet.publicKey,
      transaction: cosmosTransaction
    }

    const transaction: IACMessageDefinitionObject = {
      protocol: protocol.identifier,
      type: IACMessageType.TransactionSignRequest,
      payload: unsignedCosmosTx
    }

    const serializedTx = await this.operationsProvider.serializeTx(this.wallet, cosmosTransaction)
    console.log('serializedTx', serializedTx)

    const airGapTxs = cosmosTransaction.toAirGapTransactions('cosmos')
    const info = {
      wallet: this.wallet,
      airGapTxs,
      data: serializedDataToUrlString(serializedTx)
    }
    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async fetchRewardForDelegation(delegatorAddress: string, validatorAddress: string): Promise<BigNumber> {
    const protocol = new CosmosProtocol()
    return protocol.fetchRewardForDelegation(delegatorAddress, validatorAddress)
  }

  public setFormAmount(amount: any) {
    this.amount = amount
  }
}
