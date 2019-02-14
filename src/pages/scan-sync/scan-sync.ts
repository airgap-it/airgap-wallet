import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-scan-sync',
  templateUrl: 'scan-sync.html'
})
export class ScanSyncPage {
  constructor(public navCtrl: NavController, public navParams: NavParams) {}

  goToScanPage() {
    this.navCtrl.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    this.navCtrl.parent.select(1)
  }
}
