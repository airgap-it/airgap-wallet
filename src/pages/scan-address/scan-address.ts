import { Component, ViewChild } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'

import { ScannerProvider } from '../../providers/scanner/scanner'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'
import { PermissionsProvider } from '../../providers/permissions/permissions'
import { ScanBasePage } from '../scan-base/scan-base'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-scan-address',
  templateUrl: 'scan-address.html'
})
export class ScanAddressPage extends ScanBasePage {
  private callback: (address: string) => void
  private callbackCalled: boolean = false

  @ViewChild('addressScanner')
  zxingScanner: ZXingScannerComponent

  constructor(
    protected platform: Platform,
    protected scanner: ScannerProvider,
    protected permissionsProvider: PermissionsProvider,
    private navCtrl: NavController,
    private navParams: NavParams
  ) {
    super(platform, scanner, permissionsProvider)
    this.isBrowser = !this.platform.is('cordova')
    this.callback = this.navParams.get('callback')
  }

  checkScan(resultString: string) {
    console.log('got new text', resultString)

    this.handleQRScanned(resultString)
  }

  handleQRScanned(text: string) {
    if (!this.callbackCalled) {
      console.log('scan callback', text)
      this.callbackCalled = true
      if (this.platform.is('cordova')) {
        this.scanner.stopScan()
      } else {
        this.zxingScanner.resetCodeReader()
      }
      this.navCtrl
        .pop()
        .then(() => {
          this.sendAddressToParent(text)
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private sendAddressToParent(text: string) {
    if (this.callback) {
      // Strip "scheme" and "parameters" from URIs
      let address = text
      const [scheme, path] = text.split(':')
      if (path) {
        const splits = path.split('?')
        address = splits[0]
      }
      this.callback(address.trim())
    }
  }
}
