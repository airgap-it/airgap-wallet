import { Component } from '@angular/core'
import { ModalController } from '@ionic/angular'

import { SettingsKey, StorageProvider } from '../../services/storage/storage'

@Component({
  selector: 'page-disclaimer-web-extension',
  templateUrl: 'disclaimer-web-extension.html',
  styleUrls: ['./disclaimer-web-extension.scss']
})
export class DisclaimerWebExtensionPage {
  constructor(private readonly viewController: ModalController, private readonly storageProvider: StorageProvider) {}

  public async accept() {
    await this.storageProvider.set(SettingsKey.WEB_EXTENSION_DISCLAIMER, true)
    this.viewController.dismiss()
  }
}
