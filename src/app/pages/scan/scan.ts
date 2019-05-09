import { Component, ViewChild } from '@angular/core'
import { Platform } from '@ionic/angular'
import { Router } from '@angular/router'
import { ScannerProvider } from '../../services/scanner/scanner'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'
import { SchemeRoutingProvider } from '../../services/scheme-routing/scheme-routing'
import { PermissionsProvider } from '../../services/permissions/permissions'
import { ScanBasePage } from '../scan-base/scan-base'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-scan',
  templateUrl: 'scan.html',
  styleUrls: ['./scan.scss']
})
export class ScanPage extends ScanBasePage {
  @ViewChild('scanner')
  zxingScanner: ZXingScannerComponent

  constructor(
    protected platform: Platform,
    protected scanner: ScannerProvider,
    protected permissionsProvider: PermissionsProvider,
    private schemeRouting: SchemeRoutingProvider,
    private router: Router
  ) {
    super(platform, scanner, permissionsProvider)
    this.isBrowser = !this.platform.is('cordova')
  }

  async checkScan(resultString: string) {
    console.log('got new text', resultString)
    this.schemeRouting
      .handleNewSyncRequest(this.router, resultString, () => {
        this.startScan()
      })
      .catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
  }
}
