import { ErrorCategory, handleErrorSentry } from './../../providers/sentry-error-handler/sentry-error-handler'
import { Component } from '@angular/core'
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular'

declare var chrome: any

@Component({
  selector: 'page-extension-share-permission',
  templateUrl: 'extension-share-permission.html'
})
export class ExtensionSharePermissionPage {
  private sdk: any
  constructor(public navCtrl: NavController, private viewController: ViewController, public navParams: NavParams) {
    this.sdk = JSON.parse(this.navParams.get('sdk'))
  }

  shareWallet() {
    window.close()
  }

  public dismiss() {
    this.viewController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
