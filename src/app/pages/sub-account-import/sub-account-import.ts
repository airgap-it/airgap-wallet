import { ProtocolService } from '@airgap/angular-core'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AirGapMarketWallet, ICoinProtocol } from 'airgap-coin-lib'
import { ProtocolSymbols } from 'airgap-coin-lib/dist/utils/ProtocolSymbols'
import { map } from 'rxjs/operators'
import { PriceService } from 'src/app/services/price/price.service'

import { AccountProvider } from '../../services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-sub-account-import',
  templateUrl: 'sub-account-import.html'
})
export class SubAccountImportPage {
  private readonly subProtocolIdentifier: ProtocolSymbols
  private readonly networkIdentifier: string

  public subProtocol: ICoinProtocol
  public subWallets: AirGapMarketWallet[]

  public typeLabel: string = ''

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly accountProvider: AccountProvider,
    private readonly priceService: PriceService,
    private readonly protocolService: ProtocolService
  ) {
    this.subWallets = []
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.subProtocolIdentifier = info.subProtocolIdentifier
      this.networkIdentifier = info.networkIdentifier
      this.subProtocol = this.protocolService.getProtocol(this.subProtocolIdentifier, this.networkIdentifier)
    }

    this.accountProvider.wallets
      .pipe(map(mainAccounts => mainAccounts.filter(wallet => wallet.protocol.identifier === this.subProtocolIdentifier.split('-')[0])))
      .subscribe(mainAccounts => {
        const promises: Promise<void>[] = []
        mainAccounts.forEach(mainAccount => {
          if (!this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(mainAccount.publicKey, this.subProtocolIdentifier)) {
            const protocol = this.protocolService.getProtocol(this.subProtocolIdentifier)
            const airGapMarketWallet: AirGapMarketWallet = new AirGapMarketWallet(
              protocol,
              mainAccount.publicKey,
              mainAccount.isExtendedPublicKey,
              mainAccount.derivationPath,
              this.priceService
            )
            airGapMarketWallet.addresses = mainAccount.addresses
            promises.push(airGapMarketWallet.synchronize())
            this.subWallets.push(airGapMarketWallet)
          }
        })
        Promise.all(promises)
          .then(() => this.accountProvider.triggerWalletChanged())
          .catch(handleErrorSentry(ErrorCategory.COINLIB))
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
