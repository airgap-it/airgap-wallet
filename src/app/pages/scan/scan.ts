import { Component, ViewChild, NgZone } from '@angular/core'
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
  @ViewChild('scanner', { static: true })
  public zxingScanner: ZXingScannerComponent

  public percentageScanned: number = 0

  private parts: Set<string> = new Set()

  public isMultiQr: boolean = false

  constructor(
    protected platform: Platform,
    protected scanner: ScannerProvider,
    protected permissionsProvider: PermissionsProvider,
    private readonly schemeRouting: SchemeRoutingProvider,
    private readonly router: Router,
    private readonly ngZone: NgZone
  ) {
    super(platform, scanner, permissionsProvider)
    this.isBrowser = !this.platform.is('cordova')
  }

  public async ionViewWillEnter(): Promise<void> {
    super.ionViewWillEnter()
    this.parts = new Set()
    this.percentageScanned = 0
    this.isMultiQr = true
  }

  public async checkScan(resultString: string) {
    console.log('got new text', resultString)
    this.parts.add(resultString)
    console.log('now checking ', Array.from(this.parts))
    this.ngZone.run(() => {
      this.schemeRouting
        .handleNewSyncRequest(this.router, Array.from(this.parts), (scanResult: { availablePages: number[]; totalPages: number }) => {
          if (scanResult && scanResult.availablePages) {
            this.isMultiQr = true
            this.percentageScanned = Math.max(0, Math.min(1, scanResult.availablePages.length / scanResult.totalPages))
          }
          this.startScan()
        })
        .catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
    })
  }
}
