import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AirGapMarketWallet, ICoinProtocol } from '@airgap/coinlib-core'

import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-sub-account-select',
  templateUrl: 'sub-account-select.html'
})
export class SubAccountSelectPage {
  private readonly wallet: AirGapMarketWallet
  public protocol: ICoinProtocol
  public subWallets: AirGapMarketWallet[]

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly accountProvider: AccountProvider,
    private readonly dataService: DataService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.wallet = info.wallet
    }
    this.subWallets = []

    this.accountProvider.subWallets$.subscribe((subWallets) => {
      this.subWallets = subWallets.filter((subWallet) => subWallet.publicKey === this.wallet.publicKey)
    })
  }

  public async goToDelegateSelection(subWallet: AirGapMarketWallet) {
    const info = {
      wallet: subWallet
    }
    this.dataService.setData(DataServiceKey.DETAIL, info)
    this.router.navigateByUrl('/delegation-baker-detail/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
