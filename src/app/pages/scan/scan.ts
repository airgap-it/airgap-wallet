import { Component, ViewChild } from '@angular/core'
import { Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'

import { PermissionsProvider } from '../../services/permissions/permissions'
import { ScannerProvider } from '../../services/scanner/scanner'
import { SchemeRoutingProvider } from '../../services/scheme-routing/scheme-routing'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { ScanBasePage } from '../scan-base/scan-base'

@Component({
  selector: 'page-scan',
  templateUrl: 'scan.html',
  styleUrls: ['./scan.scss']
})
export class ScanPage extends ScanBasePage {
  @ViewChild('scanner')
  public zxingScanner: ZXingScannerComponent

  constructor(
    protected platform: Platform,
    protected scanner: ScannerProvider,
    protected permissionsProvider: PermissionsProvider,
    private readonly schemeRouting: SchemeRoutingProvider,
    private readonly router: Router
  ) {
    super(platform, scanner, permissionsProvider)
    this.isBrowser = !this.platform.is('cordova')
  }

  public async checkScan(resultString: string) {
    console.log('got new text', resultString)
    this.schemeRouting
      .handleNewSyncRequest(this.router, resultString, () => {
        this.startScan()
      })
      .catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
  }
}
