import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { AccountProvider } from '../../providers/account/account.provider'
import { AirGapMarketWallet, getProtocolByIdentifier, ICoinProtocol } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-sub-account-import',
  templateUrl: 'sub-account-import.html'
})
export class SubAccountImportPage {
  private mainAccounts: AirGapMarketWallet[]
  private protocolIdentifier: string
  public protocol: ICoinProtocol
  public subWallets: AirGapMarketWallet[]

  constructor(public navCtrl: NavController, public navParams: NavParams, private accountProvider: AccountProvider) {
    this.subWallets = []
    this.protocolIdentifier = this.navParams.get('subProtocolIdentifier')
    this.protocol = getProtocolByIdentifier(this.protocolIdentifier)

    // TODO: Use observable
    this.mainAccounts = this.accountProvider.getWalletList().filter(protocol => protocol.protocolIdentifier === 'eth')
    this.mainAccounts.forEach(mainAccount => {
      const airGapMarketWallet: AirGapMarketWallet = new AirGapMarketWallet(
        this.protocolIdentifier,
        mainAccount.publicKey,
        mainAccount.isExtendedPublicKey,
        mainAccount.derivationPath
      )
      airGapMarketWallet.addresses = mainAccount.addresses
      airGapMarketWallet.synchronize()
      this.subWallets.push(airGapMarketWallet)
    })
  }

  importWallets() {
    this.subWallets.forEach(subWallet => {
      this.accountProvider.addWallet(subWallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
    })
  }
}
