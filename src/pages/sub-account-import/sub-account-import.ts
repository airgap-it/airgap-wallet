import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { AccountProvider } from '../../providers/account/account.provider'
import { AirGapMarketWallet, getProtocolByIdentifier, ICoinProtocol } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { map } from 'rxjs/operators'

@Component({
  selector: 'page-sub-account-import',
  templateUrl: 'sub-account-import.html'
})
export class SubAccountImportPage {
  private subProtocolIdentifier: string

  public subProtocol: ICoinProtocol
  public subWallets: AirGapMarketWallet[]

  constructor(public navCtrl: NavController, public navParams: NavParams, private accountProvider: AccountProvider) {
    this.subWallets = []
    this.subProtocolIdentifier = this.navParams.get('subProtocolIdentifier')
    this.subProtocol = getProtocolByIdentifier(this.subProtocolIdentifier)

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

  importWallets() {
    this.subWallets.forEach(subWallet => {
      this.accountProvider.addWallet(subWallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
    })
    this.popToRoot()
  }

  importWallet(subWallet: AirGapMarketWallet) {
    this.accountProvider.addWallet(subWallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
    this.popToRoot()
  }

  popToRoot() {
    this.navCtrl.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
