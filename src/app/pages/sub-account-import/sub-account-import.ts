import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AirGapMarketWallet, getProtocolByIdentifier, ICoinProtocol } from 'airgap-coin-lib'
import { map } from 'rxjs/operators'

import { AccountProvider } from '../../services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-sub-account-import',
  templateUrl: 'sub-account-import.html'
})
export class SubAccountImportPage {
  private readonly subProtocolIdentifier: string

  public subProtocol: ICoinProtocol
  public subWallets: AirGapMarketWallet[]

  public typeLabel: string = ''

  constructor(private readonly router: Router, private readonly route: ActivatedRoute, private readonly accountProvider: AccountProvider) {
    this.subWallets = []
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.subProtocolIdentifier = info.subProtocolIdentifier
      this.subProtocol = getProtocolByIdentifier(this.subProtocolIdentifier)
    }

    this.accountProvider.wallets
      .pipe(map(mainAccounts => mainAccounts.filter(wallet => wallet.protocolIdentifier === this.subProtocolIdentifier.split('-')[0])))
      .subscribe(mainAccounts => {
        mainAccounts.forEach(mainAccount => {
          if (!this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(mainAccount.publicKey, this.subProtocolIdentifier)) {
            const airGapMarketWallet: AirGapMarketWallet = new AirGapMarketWallet(
              this.subProtocolIdentifier,
              mainAccount.publicKey,
              mainAccount.isExtendedPublicKey,
              mainAccount.derivationPath
            )
            airGapMarketWallet.addresses = mainAccount.addresses
            airGapMarketWallet.synchronize().catch(handleErrorSentry(ErrorCategory.COINLIB))
            this.subWallets.push(airGapMarketWallet)
          }
        })
      })
  }

  public importWallets() {
    this.subWallets.forEach(subWallet => {
      this.accountProvider.addWallet(subWallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
    })
    this.popToRoot()
  }

  public importWallet(subWallet: AirGapMarketWallet) {
    this.accountProvider.addWallet(subWallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
    this.popToRoot()
  }

  public popToRoot() {
    this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
