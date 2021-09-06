import { PermissionsService, QrScannerService } from '@airgap/angular-core'
import { Component, ViewChild } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController, Platform } from '@ionic/angular'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { ScanBasePage } from '../scan-base/scan-base'

@Component({
  selector: 'page-scan-address',
  templateUrl: 'scan-address.html',
  styleUrls: ['./scan-address.scss']
})
export class ScanAddressPage extends ScanBasePage {
  private readonly callback: ((address: string) => void) | ((address: string) => Promise<void>)
  private callbackCalled: boolean = false

  @ViewChild('addressScanner')
  public zxingScanner?: ZXingScannerComponent

  constructor(
    protected readonly platform: Platform,
    protected readonly scanner: QrScannerService,
    protected readonly permissionsProvider: PermissionsService,
    private readonly navCtrl: NavController,
    private readonly route: ActivatedRoute
  ) {
    super(platform, scanner, permissionsProvider)
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.callback = info.callback
    }
  }

  public checkScan(resultString: string): void {
    this.handleQRScanned(resultString)
  }

  public handleQRScanned(text: string): void {
    if (!this.callbackCalled) {
      this.callbackCalled = true
      if (this.platform.is('hybrid')) {
        this.scanner.destroy()
      } else if (this.zxingScanner) {
        this.zxingScanner.reset()
      }
      this.navCtrl
        .pop()
        .then(() => {
          this.sendAddressToParent(text)
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private sendAddressToParent(text: string): void {
    if (this.callback) {
      // Strip "scheme" and "parameters" from URIs
      // TODO: Use URL
      let address: string = text

      // ignore first element
      const [, path]: string[] = text.split(':')
      if (path) {
        const splits: string[] = path.split('?')
        address = splits[0]
      }
      this.callback(address.trim())
    }
  }
}
