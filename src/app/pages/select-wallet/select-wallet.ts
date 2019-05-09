import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { AccountProvider } from '../../services/account/account.provider'
import { Component } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'

import { TransactionPreparePage } from '../transaction-prepare/transaction-prepare'
import { DataService, DataServiceKey } from '../../services/data/data.service'

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
    private dataService: DataService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ionViewWillEnter() {
    if (this.route.snapshot.data['special']) {
      const info = this.route.snapshot.data['special']
      this.address = info.address
      this.compatibleWallets = info.compatibleWallets
      this.incompatibleWallets = info.incompatibleWallets
    }
  }

  openPreparePage(wallet: AirGapMarketWallet) {
    const info = {
      wallet: wallet,
      address: this.address
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/transaction-prepare/' + DataServiceKey.TRANSACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
