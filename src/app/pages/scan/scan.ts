import { IACMessageTransport, PermissionsService, QrScannerService } from '@airgap/angular-core'
import { PercentPipe } from '@angular/common'
import { Component, NgZone, ViewChild } from '@angular/core'
// import { Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'
import { IACService } from 'src/app/services/iac/iac.service'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { ScanBasePage } from '../scan-base/scan-base'

@Component({
  selector: 'page-scan',
  templateUrl: 'scan.html',
  styleUrls: ['./scan.scss'],
  providers: [PercentPipe]
})
export class ScanPage extends ScanBasePage {
  @ViewChild('scanner')
  public zxingScanner?: ZXingScannerComponent

  public percentageScanned: number = 0

  private parts: Set<string> = new Set()

  public isMultiQr: boolean = false

  constructor(
    protected platform: Platform,
    protected scanner: QrScannerService,
    protected permissionsProvider: PermissionsService,
    private readonly iacService: IACService,
    private readonly ngZone: NgZone
  ) {
    super(platform, scanner, permissionsProvider)
  }

  public async ionViewWillEnter(): Promise<void> {
    await super.ionViewWillEnter()
    this.resetScannerPage()
    this.iacService.resetHandlers()
  }

  private resetScannerPage(): void {
    this.parts = new Set()
    this.percentageScanned = 0
    this.isMultiQr = false
    this.iacService.resetHandlers()
  }

  public async checkScan(data: string): Promise<boolean | void> {
    const sizeBefore: number = this.parts.size
    this.parts.add(data)

    if (sizeBefore === this.parts.size) {
      // We scanned a string we already have in our cache, ignoring it and starting scan again.
      this.startScan()
      return undefined
    }

    this.ngZone.run(() => {
      this.iacService
        .handleRequest(data, IACMessageTransport.QR_SCANNER, (progress: number) => {
          this.isMultiQr = true
          this.percentageScanned = progress ?? 0
          this.startScan()
        })
        .catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
    })
  }

  public ionViewWillLeave(): void {
    super.ionViewWillLeave()
    this.resetScannerPage()
  }
}
