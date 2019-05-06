import { Component, ViewChild } from '@angular/core'
import { Platform, NavController } from 'ionic-angular'

import { ScannerProvider } from '../../providers/scanner/scanner'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'
import { SchemeRoutingProvider } from '../../providers/scheme-routing/scheme-routing'
import { PermissionsProvider } from '../../providers/permissions/permissions'
import { ScanBasePage } from '../scan-base/scan-base'
import { ErrorCategory, handleErrorSentry } from '../../providers/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-scan',
  templateUrl: 'scan.html'
})
export class ScanPage extends ScanBasePage {
  @ViewChild('scanner')
  zxingScanner: ZXingScannerComponent

  constructor(
    protected platform: Platform,
    protected scanner: ScannerProvider,
    protected permissionsProvider: PermissionsProvider,
    private schemeRouting: SchemeRoutingProvider,
    private navCtrl: NavController
  ) {
    super(platform, scanner, permissionsProvider)
    this.isBrowser = !this.platform.is('cordova')
  }

  checkScan(resultString: string) {
    console.log('got new text', resultString)

    this.schemeRouting
      .handleNewSyncRequest(this.navCtrl, resultString, () => {
        this.startScan()
      })
      .catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
  }
}
