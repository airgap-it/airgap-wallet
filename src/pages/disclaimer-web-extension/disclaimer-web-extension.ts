import { SettingsKey } from './../../providers/storage/storage'
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
    await this.storage.set(SettingsKey.WEB_EXTENSION_DISCLAIMER, true)
    this.viewController.dismiss()
  }
}
