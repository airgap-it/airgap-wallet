import { ClipboardService } from '@airgap/angular-core'
import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'

@Component({
  selector: 'page-account-address',
  templateUrl: 'account-address.html',
  styleUrls: ['./account-address.scss']
})
export class AccountAddressPage {
  public wallet: AirGapMarketWallet

  constructor(
    private readonly navController: NavController,
    private readonly route: ActivatedRoute,
    private readonly clipboardProvider: ClipboardService
  ) {
    if (this.route.snapshot.data.special) {
      this.wallet = this.route.snapshot.data.special
    }
  }

  public async copyAddressToClipboard(): Promise<void> {
    await this.clipboardProvider.copyAndShowToast(this.wallet.receivingPublicAddress)
  }

  public async done(): Promise<void> {
    await this.navController.pop()
  }
}
