import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'

@Component({
  selector: 'page-scan-sync',
  templateUrl: 'scan-sync.html'
})
export class ScanSyncPage {

  constructor(public navCtrl: NavController, public navParams: NavParams) { }

  goToScanPage() {
    this.navCtrl.popToRoot()
    this.navCtrl.parent.select(1)
  }
}
