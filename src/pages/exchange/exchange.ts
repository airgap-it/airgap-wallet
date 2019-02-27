import { Component } from '@angular/core'
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular'
import { AirGapMarketWallet, ICoinProtocol, getProtocolByIdentifier } from 'airgap-coin-lib'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { trigger, transition, style, animate } from '@angular/animations'

@Component({
  selector: 'page-exchange',
  templateUrl: 'exchange.html'
})
export class ExchangePage {
  constructor(public navCtrl: NavController, public navParams: NavParams) {}
}
