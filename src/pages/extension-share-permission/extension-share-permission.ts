import { WebExtensionProvider } from './../../providers/web-extension/web-extension'
import { ErrorCategory, handleErrorSentry } from './../../providers/sentry-error-handler/sentry-error-handler'
import { Component } from '@angular/core'
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular'

declare var chrome: any

@Component({
  selector: 'page-extension-share-permission',
  templateUrl: 'extension-share-permission.html'
})
export class ExtensionSharePermissionPage {
  private sdkId: any
  private address: any
  private providerId: any
  constructor(
    public navCtrl: NavController,
    private viewController: ViewController,
    public navParams: NavParams,
    private webExtensionProvider: WebExtensionProvider
  ) {
    this.sdkId = this.navParams.get('sdkId')
    this.address = this.navParams.get('address')
    this.providerId = this.navParams.get('providerId')
    console.log('SHARE PERMISSIONS providerId', this.providerId)
  }

  async shareWallet() {
    await this.webExtensionProvider.postToContent({
      jsonrpc: '2.0',
      method: 'ae:walletDetail',
      params: [this.sdkId, this.address, {}],
      id: 1,
      providerId: this.providerId
    })
    // window.close()
  }

  public dismiss() {
    this.viewController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
