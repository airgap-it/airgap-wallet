import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { ICoinProtocol } from 'airgap-coin-lib'

@Component({
  selector: 'page-protocol-select',
  templateUrl: 'protocol-select.html'
})
export class ProtocolSelectPage {
  selectedProtocol: ICoinProtocol
  protocols: ICoinProtocol[]

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.selectedProtocol = this.navParams.get('selectedProtocol')
    this.protocols = this.navParams.get('protocols')
  }
}
