import { SettingsKey, StorageProvider } from '../../providers/storage/storage'
import { ViewController } from 'ionic-angular'
import { Component } from '@angular/core'

@Component({
  selector: 'page-disclaimer-web-extension',
  templateUrl: 'disclaimer-web-extension.html'
})
export class DisclaimerWebExtensionPage {
  constructor(private viewController: ViewController, private storageProvider: StorageProvider) {}

  async accept() {
    await this.storageProvider.set(SettingsKey.WEB_EXTENSION_DISCLAIMER, true)
    this.viewController.dismiss()
  }
}
