import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AirGapMarketWallet } from 'airgap-coin-lib'

import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-select-wallet',
  templateUrl: 'select-wallet.html'
})
export class SelectWalletPage {
  public compatibleWallets: AirGapMarketWallet[] = []
  public incompatibleWallets: AirGapMarketWallet[] = []

  private address: string

  constructor(
    public accountProvider: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  public async ionViewWillEnter() {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.address = info.address
      this.compatibleWallets = info.compatibleWallets
      this.incompatibleWallets = info.incompatibleWallets
    }
  }

  public openPreparePage(wallet: AirGapMarketWallet) {
    const info = {
      wallet,
      address: this.address
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/transaction-prepare/' + DataServiceKey.TRANSACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
