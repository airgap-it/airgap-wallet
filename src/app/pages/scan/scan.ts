import { Component, NgZone, ViewChild } from '@angular/core'
import { Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'

import { PermissionsProvider } from '../../services/permissions/permissions'
import { ScannerProvider } from '../../services/scanner/scanner'
import { IACResult, SchemeRoutingProvider } from '../../services/scheme-routing/scheme-routing'
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
  public numberOfQrsScanned: number = 0
  public numberOfQrsTotal: number = 0

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
    this.isBrowser = !this.platform.is('hybrid')
  }

  public async ionViewWillEnter(): Promise<void> {
    await super.ionViewWillEnter()
    this.resetScannerPage()
  }

  private resetScannerPage(): void {
    this.parts = new Set()
    this.percentageScanned = 0
    this.isMultiQr = false
  }

  public async checkScan(resultString: string) {
    const sizeBefore: number = this.parts.size
    this.parts.add(resultString)
    if (sizeBefore === this.parts.size) {
      // We scanned a string we already have in our cache, ignoring it and starting scan again.
      console.log(`[SCAN:checkScan]: Already scanned string skipping ${resultString}`)
      this.startScan()

      return
    }

    console.log(`[SCAN:checkScan]: Trying to decode string ${resultString}`)
    this.ngZone.run(() => {
      this.schemeRouting
        .handleNewSyncRequest(this.router, Array.from(this.parts), (scanResult: { availablePages: number[]; totalPages: number }) => {
          if (scanResult && scanResult.availablePages) {
            this.isMultiQr = true
            this.numberOfQrsScanned = scanResult.availablePages.length
            this.numberOfQrsTotal = scanResult.totalPages
            this.percentageScanned = Math.max(0, Math.min(1, scanResult.availablePages.length / scanResult.totalPages))
          }
          this.startScan()
        })
        .then((result: IACResult) => {
          if (result === IACResult.SUCCESS) {
            this.resetScannerPage()
          }
        })
        .catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
    })
  }
}
