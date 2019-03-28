import { Component } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { CreateTransactionResponse } from '../../providers/exchange/exchange'
declare let cordova

@Component({
  selector: 'page-exchange-confirm',
  templateUrl: 'exchange-confirm.html'
})
export class ExchangeConfirmPage {
  public fromWallet: AirGapMarketWallet
  public toWallet: AirGapMarketWallet
  public exchangeResult: CreateTransactionResponse

  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform) {
    this.fromWallet = this.navParams.get('fromWallet')
    this.toWallet = this.navParams.get('toWallet')
    this.exchangeResult = this.navParams.get('exchangeResult')
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }

  public changellyUrl() {
    this.openUrl('https://old.changelly.com/aml-kyc')
  }
}
