import { Component } from '@angular/core'
import BigNumber from 'bignumber.js'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { AirGapPolkadotDelegateActionContext } from 'src/app/models/actions/PolkadotDelegateAction'
import { ActivatedRoute, Router } from '@angular/router'
import { ToastController, LoadingController } from '@ionic/angular'
import { PolkadotRewardDestination } from 'airgap-coin-lib/dist/protocols/polkadot/staking/PolkadotRewardDestination'
import { DataService } from 'src/app/services/data/data.service'

interface ValidatorConfig {
  name: string
  address: string
  fee: BigNumber
  enabled: boolean
}

@Component({
  selector: 'app-delegation-polkadot-validator-detail',
  templateUrl: './delegation-polkadot-validator-detail.html',
  styleUrls: ['./delegation-polkadot-validator-detail.scss']
})
export class DelegationPolkadotValidatorDetailPage {
  public validatorConfig: ValidatorConfig

  public wallet: AirGapMarketWallet

  private readonly actionCallback: (context: AirGapPolkadotDelegateActionContext) => void

  constructor(
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly route: ActivatedRoute
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      this.actionCallback = info.actionCallback

      // TODO: set validator properly
      this.validatorConfig = {
        name: 'Test Validator',
        address: '5HRHHfi3319d7Zm8bydvvKt8XvfkZJvrVnxEYa83uyebZXZ5',
        fee: new BigNumber(10000),
        enabled: true
      }
    }
  }

  ngOnInit() {}

  public async delegate(): Promise<void> {
    this.actionCallback({
      wallet: this.wallet,
      controller: this.wallet.publicKey,
      value: this.wallet.currentBalance.multipliedBy(0.9),
      fee: this.validatorConfig.fee,
      targets: [this.validatorConfig.address],
      payee: PolkadotRewardDestination.Staked,
      toastController: this.toastController,
      loadingController: this.loadingController,
      dataService: this.dataService,
      router: this.router
    })
  }
}
