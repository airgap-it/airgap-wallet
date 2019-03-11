import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { CreateTransactionResponse } from '../../providers/exchange/exchange'

@Component({
  selector: 'page-exchange-confirm',
  templateUrl: 'exchange-confirm.html'
})
export class ExchangeConfirmPage {
  public fromWallet: AirGapMarketWallet
  public toWallet: AirGapMarketWallet
  public exchangeResult: CreateTransactionResponse

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.fromWallet = this.navParams.get('fromWallet')
    this.toWallet = this.navParams.get('toWallet')
    this.exchangeResult = this.navParams.get('exchangeResult')
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ExchangeConfirmPage')
  }
}
