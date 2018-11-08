import { Component, ViewChild } from '@angular/core'
import { Platform, NavController } from 'ionic-angular'

import { ScannerProvider } from '../../providers/scanner/scanner'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'
import { SchemeRoutingProvider } from '../../providers/scheme-routing/scheme-routing'

@Component({
  selector: 'page-scan',
  templateUrl: 'scan.html'
})
export class ScanPage {
  @ViewChild('scanner')
  zxingScanner: ZXingScannerComponent
  availableDevices: MediaDeviceInfo[]
  selectedDevice: MediaDeviceInfo
  webScannerEnabled = true

  hasCameras = false

  hasCameraPermission = false
  isWebScan = false

  constructor(
    private scanner: ScannerProvider,
    private navController: NavController,
    private platform: Platform,
    private schemeRouting: SchemeRoutingProvider
  ) {}

  ionViewWillEnter() {
    if (this.platform.is('android') && this.platform.is('cordova')) {
      this.checkPermission()
    } else if (this.platform.is('cordova')) {
      this.initScan()
    } else if (this.platform.is('core')) {
      this.isWebScan = true
      this.zxingScanner.camerasNotFound.subscribe((devices: MediaDeviceInfo[]) => {
        console.error('An error has occurred when trying to enumerate your video-stream-enabled devices.')
      })
      if (this.selectedDevice) {
        // Not the first time that we open scanner
        this.zxingScanner.startScan(this.selectedDevice)
      }
      this.zxingScanner.camerasFound.subscribe((devices: MediaDeviceInfo[]) => {
        this.hasCameras = true
        this.availableDevices = devices
        this.selectedDevice = devices[0]
      })
    }
  }

  public checkPermission(entering: boolean = true) {
    console.log('checking permissions')
    if (this.hasCameraPermission) {
      console.log('has permissions, init scan')
      this.initScan()
    } else {
      console.log('does not have permissions, requesting')
      this.scanner
        .hasPermission()
        .then((permissions: boolean[]) => {
          console.log('checked permissions', permissions)
          if (permissions[0]) {
            this.initScan()
          } else if (!entering) {
            // Permanent deny
            console.log('bla', permissions)

            if (permissions[1] && this.platform.is('android')) {
              this.checkPermission()
            } else {
              this.scanner.askForPermission()
            }
          }
        })
        .catch(e => console.log('error!', e))
    }
  }

  public startScan() {
    this.scanner.show()
    this.scanner.scan(text => {
      this.handleQrCodeResult(text)
    }, console.error)
  }

  ionViewWillLeave() {
    this.scanner.destroy()
  }

  private initScan() {
    this.hasCameraPermission = true
    this.startScan()
  }

  handleQrCodeResult(resultString: string) {
    console.log('got new text', resultString)

    this.schemeRouting.handleNewSyncRequest(this.navController, resultString)
  }

  ionViewDidLeave() {
    this.zxingScanner.resetScan()
    console.log('ionViewDidLeave')
  }
}
