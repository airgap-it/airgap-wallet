import { Component, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { NavController, Platform } from '@ionic/angular'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'

import { PermissionsProvider } from '../../services/permissions/permissions'
import { ScannerProvider } from '../../services/scanner/scanner'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { ScanBasePage } from '../scan-base/scan-base'

@Component({
  selector: 'page-scan-address',
  templateUrl: 'scan-address.html',
  styleUrls: ['./scan-address.scss']
})
export class ScanAddressPage extends ScanBasePage {
  private readonly callback: (address: string) => void
  private callbackCalled: boolean = false

  @ViewChild('addressScanner')
  public zxingScanner: ZXingScannerComponent

  constructor(
    protected platform: Platform,
    protected scanner: ScannerProvider,
    protected permissionsProvider: PermissionsProvider,
    private readonly navCtrl: NavController,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    super(platform, scanner, permissionsProvider)
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.callback = info.callback
    }
    this.isBrowser = !this.platform.is('cordova')
  }

  public checkScan(resultString: string) {
    console.log('got new text', resultString)

    this.handleQRScanned(resultString)
  }

  public handleQRScanned(text: string) {
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
