import { Component } from '@angular/core'
import { AirGapMarketWallet, ICoinProtocol } from 'airgap-coin-lib'
import { Router, ActivatedRoute } from '@angular/router'
import { handleErrorSentry, ErrorCategory } from '../../services/sentry-error-handler/sentry-error-handler'
import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'

@Component({
  selector: 'page-sub-account-select',
  templateUrl: 'sub-account-select.html'
})
export class SubAccountSelectPage {
  private wallet: AirGapMarketWallet
  public protocol: ICoinProtocol
  public subWallets: AirGapMarketWallet[]

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private accountProvider: AccountProvider,
    private dataService: DataService
  ) {
    if (this.route.snapshot.data['special']) {
      const info = this.route.snapshot.data['special']
      this.wallet = info.wallet
    }
    this.subWallets = []

    this.accountProvider.subWallets.subscribe(subWallets => {
      this.subWallets = subWallets.filter(subWallet => subWallet.publicKey === this.wallet.publicKey)
    })
  }

  async goToDelegateSelection(subWallet: AirGapMarketWallet) {
    const info = {
      wallet: subWallet
    }
    this.dataService.setData(DataServiceKey.DETAIL, info)
    this.router.navigateByUrl('/delegation-baker-detail/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
