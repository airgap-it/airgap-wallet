import { ValidatorService, ValidatorInfos } from './../../services/validator/validator.service'
import { AirGapCosmosDelegateActionContext } from './../../models/actions/CosmosDelegateAction'
import { ActivatedRoute, Router } from '@angular/router'
import { Component } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ToastController, LoadingController } from '@ionic/angular'
import { DataService } from 'src/app/services/data/data.service'
import BigNumber from 'bignumber.js'

@Component({
  selector: 'page-delegation-cosmos',
  templateUrl: './delegation-cosmos.page.html',
  styleUrls: ['./delegation-cosmos.page.scss']
})
export class DelegationCosmosPage {
  public wallet: AirGapMarketWallet
  private readonly validatorAddress: string = 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0'
  public validatorInfos: ValidatorInfos
  public validatorCommission: string | undefined
  public validatorStatus: string | undefined

  private readonly actionCallback: (context: AirGapCosmosDelegateActionContext) => void

  constructor(
    private readonly route: ActivatedRoute,
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
      this.getValidatorInfos()
    }
  }

  public async getValidatorInfos() {
    this.validatorInfos = await this.validatorService.getValidatorInfos(this.validatorAddress)
    this.validatorCommission = this.validatorInfos.rate
    this.validatorStatus = this.validatorInfos.status
  }

  public async delegate(): Promise<void> {
    this.actionCallback({
      wallet: this.wallet,
      validatorAddress: this.validatorAddress,
      amount: new BigNumber(0),
      undelegate: false,
      toastController: this.toastController,
      loadingController: this.loadingController,
      dataService: this.dataService,
      router: this.router
    })
  }
}
