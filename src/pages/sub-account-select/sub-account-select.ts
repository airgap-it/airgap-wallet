import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { AirGapMarketWallet, ICoinProtocol } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { AccountProvider } from '../../providers/account/account.provider'
import { DelegationBakerDetailPage } from '../delegation-baker-detail/delegation-baker-detail'

@Component({
  selector: 'page-sub-account-select',
  templateUrl: 'sub-account-select.html'
})
export class SubAccountSelectPage {
  private wallet: AirGapMarketWallet
  public protocol: ICoinProtocol
  public subWallets: AirGapMarketWallet[]

  constructor(public navCtrl: NavController, public navParams: NavParams, private accountProvider: AccountProvider) {
    this.subWallets = []
    this.wallet = this.navParams.get('wallet')

    this.accountProvider.subWallets.subscribe(subWallets => {
      this.subWallets = subWallets.filter(subWallet => subWallet.publicKey === this.wallet.publicKey)
    })
  }

  async goToDelegateSelection(subWallet: AirGapMarketWallet) {
    this.navCtrl
      .push(DelegationBakerDetailPage, {
        wallet: subWallet
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
