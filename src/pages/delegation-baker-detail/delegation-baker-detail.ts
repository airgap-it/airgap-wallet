import { Component } from '@angular/core'
import { NavController, NavParams, ToastController } from 'ionic-angular'
import { BakerInfo, DelegationRewardInfo, TezosKtProtocol, AirGapMarketWallet } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'
import { OperationsProvider } from '../../providers/operations/operations'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { RemoteConfigProvider, BakerConfig } from '../../providers/remote-config/remote-config'
import moment from 'moment'

const hoursPerCycle = 68

@Component({
  selector: 'page-delegation-baker-detail',
  templateUrl: 'delegation-baker-detail.html'
})
export class DelegationBakerDetailPage {
  public bakerConfig: BakerConfig

  public wallet: AirGapMarketWallet

  public bakerInfo: BakerInfo
  public delegationRewards: DelegationRewardInfo[]

  public avgRoIPerCyclePercentage: BigNumber
  public avgRoIPerCycle: BigNumber

  public isDelegated: boolean
  public nextPayout: Date

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public toastController: ToastController,
    public operationsProvider: OperationsProvider,
    public remoteConfigProvider: RemoteConfigProvider
  ) {
    this.wallet = this.navParams.get('wallet')
  }

  async ionViewDidLoad() {
    // get baker 0, always airgap for now
    this.bakerConfig = (await this.remoteConfigProvider.tezosBakers())[0]

    const delegationCheck = await this.operationsProvider.checkDelegated(this.wallet.receivingPublicAddress)
    this.isDelegated = delegationCheck.isDelegated

    const kt = new TezosKtProtocol()

    this.bakerInfo = await kt.bakerInfo(this.bakerConfig.address)
    this.delegationRewards = await kt.delegationRewards(this.bakerConfig.address)

    // we are already delegating, and to this address
    if (delegationCheck.isDelegated && delegationCheck.value === this.bakerConfig.address) {
      const delegatedCycles = this.delegationRewards.filter(value => value.delegatedBalance.isGreaterThan(0))

      this.nextPayout =
        delegatedCycles.length > 0
          ? delegatedCycles[0].payout
          : moment()
              .add(hoursPerCycle * 7 + this.bakerConfig.payout.cycles, 'h')
              .toDate()

      // make sure there are at least 7 cycles to wait
      if (
        moment(delegationCheck.delegatedDate)
          .add(hoursPerCycle * 7 + this.bakerConfig.payout.cycles, 'h')
          .isAfter(this.nextPayout)
      ) {
        this.nextPayout = moment(delegationCheck.delegatedDate)
          .add(hoursPerCycle * 7 + this.bakerConfig.payout.cycles, 'h')
          .toDate()
      }
    } else {
      // if we are currently delegated, but to someone else, first payout is in 7 cycles, same for if we are undelegated
      this.nextPayout = moment()
        .add(hoursPerCycle * 7 + this.bakerConfig.payout.cycles, 'h')
        .toDate()
    }

    this.avgRoIPerCyclePercentage = this.delegationRewards
      .map(delegationInfo => {
        return delegationInfo.totalRewards.plus(delegationInfo.totalFees).div(delegationInfo.stakingBalance)
      })
      .reduce((avg, value) => {
        return avg.plus(value)
      })
      .div(this.delegationRewards.length)

    this.avgRoIPerCycle = this.avgRoIPerCyclePercentage.multipliedBy(this.wallet.currentBalance)
  }

  async delegate() {
    try {
      const pageOptions = await this.operationsProvider.prepareDelegate(this.wallet, this.bakerConfig.address)
      this.navCtrl.push(pageOptions.page, pageOptions.params).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      handleErrorSentry(ErrorCategory.OPERATIONS_PROVIDER)(error)

      this.toastController
        .create({
          message: error,
          duration: 3000,
          position: 'bottom'
        })
        .present()
        .catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
    }
  }
}
