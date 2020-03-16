import { Component } from '@angular/core'
// import BigNumber from 'bignumber.js'
import { AirGapMarketWallet } from 'airgap-coin-lib'
// import { AirGapPolkadotDelegateActionContext } from 'src/app/models/actions/PolkadotDelegateAction'
import { ActivatedRoute } from '@angular/router'
// import { ActivatedRoute, Router } from '@angular/router'
import { PopoverController } from '@ionic/angular'
// import { ToastController, LoadingController, PopoverController } from '@ionic/angular'
// import { PolkadotRewardDestination } from 'airgap-coin-lib/dist/protocols/polkadot/staking/PolkadotRewardDestination'
// import { DataService } from 'src/app/services/data/data.service'
import { DelegateEditPopoverComponent } from 'src/app/components/delegate-edit-popover/delegate-edit-popover.component'
import { OverlayEventDetail } from '@ionic/angular/node_modules/@ionic/core'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { BehaviorSubject } from 'rxjs'
import { AirGapDelegateeDetails, AirGapDelegatorDetails } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { OperationsProvider } from 'src/app/services/operations/operations'
import { supportsDelegation, supportsAirGapDelegation } from 'src/app/helpers/delegation'

@Component({
  selector: 'app-delegation-detail',
  templateUrl: './delegation-detail.html',
  styleUrls: ['./delegation-detail.scss']
})
export class DelegationDetailPage {
  public delegateeLabel: string

  public wallet: AirGapMarketWallet

  public delegateeDetails: AirGapDelegateeDetails | null = null
  public delegatorDetails: AirGapDelegatorDetails | null = null

  private readonly delegateeAddress$: BehaviorSubject<string> = new BehaviorSubject(null)

  // private readonly actionCallback: (context: AirGapPolkadotDelegateActionContext) => void

  constructor(
    private readonly operations: OperationsProvider,
    // private readonly toastController: ToastController,
    // private readonly loadingController: LoadingController,
    private readonly popoverCtrl: PopoverController,
    // private readonly router: Router,
    // private readonly dataService: DataService,
    private readonly route: ActivatedRoute
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
      // this.actionCallback = info.actionCallback
    }

    this.delegateeLabel = supportsAirGapDelegation(this.wallet.coinProtocol) ? this.wallet.coinProtocol.delegateeLabel : 'Delegation'

    if (supportsDelegation(this.wallet.coinProtocol)) {
      this.subscribeObservables()

      this.operations
        .getCurrentDelegatee(this.wallet.coinProtocol, this.wallet.receivingPublicAddress)
        .then(address => this.delegateeAddress$.next(address))

      this.operations
        .getDelegatorDetails(this.wallet.coinProtocol, this.wallet.receivingPublicAddress)
        .then(details => (this.delegatorDetails = details))
    }
  }

  public async delegate(): Promise<void> {
    // this.actionCallback({
    //   wallet: this.wallet,
    //   controller: this.wallet.publicKey,
    //   value: this.wallet.currentBalance.multipliedBy(0.1),
    //   fee: this.wallet.currentBalance.multipliedBy(0.001),
    //   targets: [this.validatorInfo.address],
    //   payee: PolkadotRewardDestination.Staked,
    //   toastController: this.toastController,
    //   loadingController: this.loadingController,
    //   dataService: this.dataService,
    //   router: this.router
    // })
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
          // const validatorDetails = await (this.wallet.coinProtocol as PolkadotProtocol).getValidatorDetails(data.bakerAddress)
          // this.validatorInfo = {
          //   name: validatorDetails.name,
          //   address: data.bakerAddress,
          //   commission: validatorDetails.commission,
          //   status: validatorDetails.status,
          //   usage: validatorDetails.ownStash.dividedBy(validatorDetails.totalStakingBalance),
          //   ownStash: validatorDetails.ownStash,
          //   stakingBalance: validatorDetails.totalStakingBalance
          // }
        }
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    return popover.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private subscribeObservables() {
    this.delegateeAddress$.subscribe(address => {
      if (address && supportsDelegation(this.wallet.coinProtocol)) {
        this.operations.getDelegateeDetails(this.wallet.coinProtocol, address).then(details => (this.delegateeDetails = details))
      }
    })
  }
}
