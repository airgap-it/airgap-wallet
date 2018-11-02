import { Component, ViewChild } from '@angular/core'
import { IAirGapTransaction } from 'airgap-coin-lib'
import { NavController, Platform, ToastController } from 'ionic-angular'

import { QrProvider } from '../../providers/qr/qr'
import { ScannerProvider } from '../../providers/scanner/scanner'
import { TransactionConfirmPage } from '../transaction-confirm/transaction-confirm'
import { WalletImportPage } from '../wallet-import/wallet-import'
import { ZXingScannerComponent } from '@zxing/ngx-scanner'

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
    private navController: NavController,
    private scanner: ScannerProvider,
    private platform: Platform,
    private toastController: ToastController,
    private qrProvider: QrProvider
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

  handleImport(data: string) {
    this.navController
      .push(WalletImportPage, {
        data: data
      })
      .then(v => {
        console.log('WalletImportPage openend', v)
        // this.navController.push(PortfolioPage)
      })
      .catch(e => {
        console.log('WalletImportPage failed to open', e)
      })
  }

  handleBroadcast(qrText: string) {
    let transaction: IAirGapTransaction = this.qrProvider.getBroadcastFromData(qrText)

    if (transaction) {
      this.navController
        .push(TransactionConfirmPage, {
          transaction: transaction
        })
        .then(v => {
          console.log('TransactionConfirmPage opened', v)
        })
        .catch(e => {
          console.log('TransactionConfirmPage failed to open', e)
        })
    }
  }

  public startScan() {
    this.scanner.show()
    this.scanner.scan(text => {
      const syncPrefix = 'airgap-wallet://import?data='
      const broadcastPrefix = 'airgap-wallet://broadcast?data='

      if (text.startsWith(syncPrefix)) {
        let parts = text.split(syncPrefix)
        this.handleImport(parts[parts.length - 1])
      } else if (text.startsWith(broadcastPrefix)) {
        let parts = text.split(broadcastPrefix)
        this.handleBroadcast(parts[parts.length - 1])
      } else {
        this.displayToast('Invalid QR Code')
        this.startScan()
      }
    }, console.error)
  }

  private displayToast(message: string) {
    this.toastController
      .create({
        message: message,
        duration: 3000,
        position: 'bottom'
      })
      .present()
  }

  ionViewWillLeave() {
    this.scanner.destroy()
  }

  private initScan() {
    this.hasCameraPermission = true
    this.startScan()
  }

  handleQrCodeResult(resultString: string) {
    const syncPrefix = 'airgap-wallet://import?data='
    const broadcastPrefix = 'airgap-wallet://broadcast?data='
    if (resultString.startsWith(syncPrefix)) {
      let parts = resultString.split(syncPrefix)
      this.handleImport(parts[parts.length - 1])
      this.webScan = false
    } else if (resultString.startsWith(broadcastPrefix)) {
      let parts = resultString.split(broadcastPrefix)
      this.handleBroadcast(parts[parts.length - 1])
      this.webScan = false
      // this.scanner.stopZxingScan()
    } else {
      this.displayToast('Invalid QR Code')
      this.startScan()
    }
  }

  ionViewDidLeave() {
    this.webScan = false
    console.log('ionViewDidLeave')
  }
}
