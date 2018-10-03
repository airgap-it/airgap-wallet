import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'

import { ScannerProvider } from '../../providers/scanner/scanner'

@Component({
  selector: 'page-scan-address',
  templateUrl: 'scan-address.html'
})
export class ScanAddressPage {
  private callback: (address: string) => void
  private callbackCalled: boolean = false

  constructor(public navCtrl: NavController, public navParams: NavParams, private scanner: ScannerProvider) {
    this.callback = this.navParams.get('callback')
  }

  ionViewWillEnter() {
    this.scanner.show()
    this.scanner.scan(
      text => {
        if (!this.callbackCalled) {
          console.log('scan callback', text)
          this.callbackCalled = true
          this.scanner.stopScan()
          this.navCtrl.pop().then(() => {
            this.sendAddressToParent(text)
          })
        }
      },
      error => {
        console.log(error)
      }
    )
  }

  ionViewWillLeave() {
    this.scanner.destroy()
  }

  private sendAddressToParent(address: string) {
    this.callback(address)
  }
}
