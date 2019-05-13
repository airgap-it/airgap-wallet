import { Location } from '@angular/common'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { ToastController } from '@ionic/angular'
import { AirGapMarketWallet, BakerInfo, DelegationRewardInfo, TezosKtProtocol } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'
import * as moment from 'moment'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ProtocolSymbols } from '../../services/protocols/protocols'
import { BakerConfig, RemoteConfigProvider } from '../../services/remote-config/remote-config'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

type Moment = moment.Moment

const hoursPerCycle = 68

@Component({
  selector: 'page-delegation-baker-detail',
  templateUrl: 'delegation-baker-detail.html',
  styleUrls: ['./delegation-baker-detail.scss']
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
    public location: Location,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    public toastController: ToastController,
    public operationsProvider: OperationsProvider,
    public remoteConfigProvider: RemoteConfigProvider,
    private readonly dataService: DataService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
    }
  }

  public async ionViewDidEnter() {
    // get baker 0, always airgap for now
    this.bakerConfig = (await this.remoteConfigProvider.tezosBakers())[0]

    const delegationCheck = await this.operationsProvider.checkDelegated(this.wallet.receivingPublicAddress)
    this.isDelegated = delegationCheck.isDelegated

    const kt = new TezosKtProtocol()

    this.bakerInfo = await kt.bakerInfo(this.bakerConfig.address)
    try {
      this.delegationRewards = await kt.delegationRewards(this.bakerConfig.address)

      // we are already delegating, and to this address
      if (delegationCheck.isDelegated && delegationCheck.value === this.bakerConfig.address) {
        const delegatedCycles = this.delegationRewards.filter(value => value.delegatedBalance.isGreaterThan(0))

        this.nextPayout = delegatedCycles.length > 0 ? delegatedCycles[0].payout : this.addPayoutDelayToMoment(moment()).toDate()

        // make sure there are at least 7 cycles to wait
        if (this.addPayoutDelayToMoment(moment(delegationCheck.delegatedDate)).isAfter(this.nextPayout)) {
          this.nextPayout = this.addPayoutDelayToMoment(moment(delegationCheck.delegatedDate)).toDate()
        }
      } else {
        // if we are currently delegated, but to someone else, first payout is in 7 cycles, same for if we are undelegated
        this.nextPayout = this.addPayoutDelayToMoment(moment()).toDate()
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
    } catch (error) {
      // If Baker has never delegated
    }
  }

  public addPayoutDelayToMoment(time: Moment): Moment {
    return time.add(hoursPerCycle * 7 + this.bakerConfig.payout.cycles, 'h')
  }

  public async delegate() {
    try {
      if (this.wallet.protocolIdentifier === ProtocolSymbols.XTZ) {
        const pageOptions = await this.operationsProvider.prepareOriginate(this.wallet, this.bakerConfig.address)
        this.dataService.setData(DataServiceKey.INTERACTION, pageOptions.params)
        this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      } else {
        const pageOptions = await this.operationsProvider.prepareDelegate(this.wallet, this.bakerConfig.address)
        this.dataService.setData(DataServiceKey.INTERACTION, pageOptions.params)
        this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      }
    } catch (error) {
      handleErrorSentry(ErrorCategory.OPERATIONS_PROVIDER)(error)

      this.toastController
        .create({
          message: error.message,
          duration: 3000,
          position: 'bottom'
        })
        .then(toast => {
          toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
        })
    }
  }

  public async done() {
    this.location.back()
  }
}
