import { Component } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ClipboardProvider } from '../../services/clipboard/clipboard'
import { Router, ActivatedRoute } from '@angular/router'
import { Location } from '@angular/common'

@Component({
  selector: 'page-account-address',
  templateUrl: 'account-address.html',
  styleUrls: ['./account-address.scss']
})
export class AccountAddressPage {
  public wallet: AirGapMarketWallet

  constructor(
    private location: Location,
    private router: Router,
    private route: ActivatedRoute,
    private clipboardProvider: ClipboardProvider
  ) {
    if (this.route.snapshot.data['special']) {
      this.wallet = this.route.snapshot.data['special']
    }
  }

  async copyAddressToClipboard() {
    await this.clipboardProvider.copyAndShowToast(this.wallet.receivingPublicAddress)
  }

  async done() {
    this.location.back()
  }
}
