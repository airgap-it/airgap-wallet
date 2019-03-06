import { Storage } from '@ionic/storage'
import { ViewController } from 'ionic-angular'
import { Component } from '@angular/core'

@Component({
  selector: 'page-disclaimer-web-extension',
  templateUrl: 'disclaimer-web-extension.html'
})
export class DisclaimerWebExtensionPage {
  constructor(private viewController: ViewController, private storage: Storage) {}

  async accept() {
    await this.storage.set('CHROME_EXTENSION_INTRODUCTION', true)
    this.viewController.dismiss()
  }
}
