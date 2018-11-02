import { Component, ViewChild } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'

import { ScannerProvider } from '../../providers/scanner/scanner'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'

@Component({
  selector: 'page-scan-address',
  templateUrl: 'scan-address.html'
})
export class ScanAddressPage {
  private callback: (address: string) => void
  private callbackCalled: boolean = false

  /* web scanner */
  @ViewChild('scanner')
  zxingScanner: ZXingScannerComponent
  availableDevices: MediaDeviceInfo[]
  selectedDevice: MediaDeviceInfo
  webScan = false

  constructor(public navCtrl: NavController, public navParams: NavParams, private platform: Platform, private scanner: ScannerProvider) {
    this.callback = this.navParams.get('callback')
  }

  ionViewWillEnter() {
    if (this.platform.is('cordova')) {
      this.scanner.show()
      this.scanner.scan(
        text => {
          this.handleQRScanned(text)
        },
        error => {
          console.log(error)
        }
      )
    } else if (this.platform.is('core')) {
      this.webScan = true
      console.log(this.zxingScanner)
      this.zxingScanner.camerasNotFound.subscribe((devices: MediaDeviceInfo[]) => {
        console.error('An error has occurred when trying to enumerate your video-stream-enabled devices.')
      })
      if (this.selectedDevice) {
        // Not the first time that we open scanner
        this.zxingScanner.startScan(this.selectedDevice)
      }
      this.zxingScanner.camerasFound.subscribe((devices: MediaDeviceInfo[]) => {
        this.availableDevices = devices
        this.selectedDevice = devices[0]
      })
    }
  }

  handleQRScanned(text: string) {
    if (!this.callbackCalled) {
      console.log('scan callback', text)
      this.callbackCalled = true
      if (this.platform.is('cordova')) {
        this.scanner.stopScan()
      } else {
        this.webScan = false
      }
      this.navCtrl.pop().then(() => {
        this.sendAddressToParent(text)
      })
    }
  }

  ionViewWillLeave() {
    if (this.platform.is('cordova')) {
      this.scanner.destroy()
    } else {
      this.webScan = false
    }
  }

  private sendAddressToParent(address: string) {
    if (this.callback) {
      this.callback(address)
    }
  }
}
