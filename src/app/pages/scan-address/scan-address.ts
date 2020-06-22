import { Component, ViewChild } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
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
  public zxingScanner?: ZXingScannerComponent

  constructor(
    protected readonly platform: Platform,
    protected readonly scanner: ScannerProvider,
    protected readonly permissionsProvider: PermissionsProvider,
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
    console.log('got new text', resultString)

    this.handleQRScanned(resultString)
  }

  public handleQRScanned(text: string): void {
    if (!this.callbackCalled) {
      console.log('scan callback', text)
      this.callbackCalled = true
      if (this.platform.is('hybrid')) {
        this.scanner.stopScan()
      } else if (this.zxingScanner) {
        this.zxingScanner.codeReader.reset()
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
