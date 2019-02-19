import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { AirGapMarketWallet, ICoinProtocol } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from '../../providers/operations/operations'
import { AccountProvider } from '../../providers/account/account.provider'

@Component({
  selector: 'page-sub-account-select',
  templateUrl: 'sub-account-select.html'
})
export class SubAccountSelectPage {
  private wallet: AirGapMarketWallet
  public protocol: ICoinProtocol
  public subWallets: AirGapMarketWallet[]

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private accountProvider: AccountProvider,
    private operationsProvider: OperationsProvider
  ) {
    this.subWallets = []
    this.wallet = this.navParams.get('wallet')

    this.accountProvider.subWallets.subscribe(subWallets => {
      this.subWallets = subWallets.filter(subWallet => subWallet.publicKey === this.wallet.publicKey)
    })
  }

  async prepareDelegate(subWallet: AirGapMarketWallet) {
    const pageOptions = await this.operationsProvider.prepareDelegate(
      this.wallet,
      subWallet.receivingPublicAddress,
      'tz1eEnQhbwf6trb8Q8mPb2RaPkNk2rN7BKi8'
    )

    this.navCtrl.push(pageOptions.page, pageOptions.params).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
