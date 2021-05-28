import { IACHandlerStatus, IACMessageTransport, PermissionsService, QrScannerService } from '@airgap/angular-core'
import { Component, NgZone, ViewChild } from '@angular/core'
import { Platform } from '@ionic/angular'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'
import { IACService } from 'src/app/services/iac/iac.service'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { ScanBasePage } from '../scan-base/scan-base'

@Component({
  selector: 'page-scan',
  templateUrl: 'scan.html',
  styleUrls: ['./scan.scss']
})
export class ScanPage extends ScanBasePage {
  @ViewChild('scanner')
  public zxingScanner?: ZXingScannerComponent

  public percentageScanned: number = 0
  public numberOfQrsScanned: number = 0
  public numberOfQrsTotal: number = 0

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
      this.iacService
        .handleRequest(
          Array.from(this.parts)[0],
          IACMessageTransport.QR_SCANNER,
          (progress: number | { currentPage: number; totalPageNumber: number }) => {
            console.log('scan result', progress)

            this.startScan()
          }
        )
        .then((result: IACHandlerStatus) => {
          if (result === IACHandlerStatus.SUCCESS) {
            this.resetScannerPage()
          }
        })
        .catch(handleErrorSentry(ErrorCategory.SCHEME_ROUTING))
    })
  }
}
