import { Component } from '@angular/core'
import BigNumber from 'bignumber.js'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { AirGapPolkadotDelegateActionContext } from 'src/app/models/actions/PolkadotDelegateAction'
import { ActivatedRoute, Router } from '@angular/router'
import { ToastController, LoadingController, PopoverController } from '@ionic/angular'
import { PolkadotRewardDestination } from 'airgap-coin-lib/dist/protocols/polkadot/staking/PolkadotRewardDestination'
import { PolkadotProtocol } from 'airgap-coin-lib/dist/protocols/polkadot/PolkadotProtocol'
import { DataService } from 'src/app/services/data/data.service'
import { DelegateEditPopoverComponent } from 'src/app/components/delegate-edit-popover/delegate-edit-popover.component'
import { OverlayEventDetail } from '@ionic/angular/node_modules/@ionic/core'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'

interface ValidatorInfo {
  name: string
  address: string
  commission: BigNumber
  status: string
  usage: BigNumber
  ownStash: BigNumber
  stakingBalance: BigNumber
}

@Component({
  selector: 'app-delegation-polkadot-validator-detail',
  templateUrl: './delegation-polkadot-validator-detail.html',
  styleUrls: ['./delegation-polkadot-validator-detail.scss']
})
export class DelegationPolkadotValidatorDetailPage {
  public validatorInfo: ValidatorInfo
  public wallet: AirGapMarketWallet

  private readonly actionCallback: (context: AirGapPolkadotDelegateActionContext) => void

  constructor(
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly popoverCtrl: PopoverController,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly route: ActivatedRoute
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.actionCallback = info.actionCallback
    }
  }

  public async delegate(): Promise<void> {
    this.actionCallback({
      wallet: this.wallet,
      controller: this.wallet.publicKey,
      value: this.wallet.currentBalance.multipliedBy(0.1),
      fee: this.wallet.currentBalance.multipliedBy(0.001),
      targets: [this.validatorInfo.address],
      payee: PolkadotRewardDestination.Staked,
      toastController: this.toastController,
      loadingController: this.loadingController,
      dataService: this.dataService,
      router: this.router
    })
  }

  public async presentEditPopover(event: Event): Promise<void> {
    const popover: HTMLIonPopoverElement = await this.popoverCtrl.create({
      component: DelegateEditPopoverComponent,
      componentProps: {
        hideAirGap: true
      },
      event,
      translucent: true
    })

    function isBakerAddressObject(value: unknown): value is { bakerAddress: string } {
      return value instanceof Object && 'bakerAddress' in value
    }

    popover
      .onDidDismiss()
      .then(async ({ data }: OverlayEventDetail<unknown>) => {
        if (isBakerAddressObject(data)) {
          const validatorDetails = await (this.wallet.coinProtocol as PolkadotProtocol).getValidatorDetails(data.bakerAddress)
          this.validatorInfo = {
            name: validatorDetails.name,
            address: data.bakerAddress,
            commission: validatorDetails.commission,
            status: validatorDetails.status,
            usage: validatorDetails.ownStash.dividedBy(validatorDetails.totalStakingBalance),
            ownStash: validatorDetails.ownStash,
            stakingBalance: validatorDetails.totalStakingBalance
          }
        }
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    return popover.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
