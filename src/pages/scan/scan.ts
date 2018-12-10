import { Component, ViewChild } from '@angular/core'
import { Platform, NavController } from 'ionic-angular'

import { ScannerProvider } from '../../providers/scanner/scanner'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'
import { SchemeRoutingProvider } from '../../providers/scheme-routing/scheme-routing'
import { PermissionsProvider, PermissionTypes, PermissionStatus } from '../../providers/permissions/permissions'

@Component({
  selector: 'page-scan',
  templateUrl: 'scan.html'
})
export class ScanPage {
  @ViewChild('scanner')
  zxingScanner: ZXingScannerComponent
  availableDevices: MediaDeviceInfo[]
  selectedDevice: MediaDeviceInfo
  scannerEnabled = true

  public isBrowser = false

  hasCameras = false

  private webscanner: any
  private selectedCamera

  public hasCameraPermission = false

  constructor(
    private scanner: ScannerProvider,
    private navController: NavController,
    private platform: Platform,
    private schemeRouting: SchemeRoutingProvider,
    private permissionsProvider: PermissionsProvider
  ) {
    this.isBrowser = !this.platform.is('cordova')
  }

  async ionViewWillEnter() {
    if (this.platform.is('cordova')) {
      await this.platform.ready()
      await this.checkCameraPermissionsAndActivate()
    }
  }

  async requestPermission() {
    await this.permissionsProvider.userRequestsPermissions([PermissionTypes.CAMERA])
    await this.checkCameraPermissionsAndActivate()
  }

  async checkCameraPermissionsAndActivate() {
    const permission = await this.permissionsProvider.hasCameraPermission()
    if (permission === PermissionStatus.GRANTED) {
      this.hasCameraPermission = true
      this.startScan()
    }
  }

  ionViewDidEnter() {
    if (!this.platform.is('cordova')) {
      this.hasCameraPermission = true
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

  ionViewWillLeave() {
    if (this.platform.is('cordova')) {
      this.scanner.destroy()
    } else {
      this.zxingScanner.resetCodeReader()
    }
  }

  public startScan() {
    if (this.platform.is('cordova')) {
      this.scanner.show()
      this.scanner.scan(
        text => {
          this.checkScan(text)
        },
        error => {
          console.warn(error)
          this.startScan()
        }
      )
    } else {
      // We don't need to do anything in the browser because it keeps scanning
    }
  }

  checkScan(resultString: string) {
    console.log('got new text', resultString)

    this.schemeRouting.handleNewSyncRequest(this.navController, resultString)
  }
}
