import { Component } from '@angular/core'
import { Events, ModalController } from '@ionic/angular'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../../services/storage/storage'
import { WebExtensionProvider } from '../../services/web-extension/web-extension'
import { DisclaimerWebExtensionPage } from '../disclaimer-web-extension/disclaimer-web-extension'
import { ExchangePage } from '../exchange/exchange'
import { IntroductionPage } from '../introduction/introduction'
import { PortfolioPage } from '../portfolio/portfolio'
import { ScanPage } from '../scan/scan'
import { SettingsPage } from '../settings/settings'

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {
  tab1Root = PortfolioPage
  tab2Root = ScanPage
  tab3Root = ExchangePage
  tab4Root = SettingsPage

  constructor(
    public modalController: ModalController,
    private storageProvider: StorageProvider,
    private webExtensionProvider: WebExtensionProvider
  ) {
    this.showIntroductions().catch(handleErrorSentry(ErrorCategory.OTHER))
  }

  private async showIntroductions() {
    if (this.webExtensionProvider.isWebExtension()) {
      await this.showWebExtensionIntroduction()
    }
    await this.showWalletIntroduction().catch(console.error)
  }

  private async showWalletIntroduction() {
    return this.showModal(SettingsKey.WALLET_INTRODUCTION, IntroductionPage)
  }

  private async showWebExtensionIntroduction() {
    return this.showModal(SettingsKey.WEB_EXTENSION_DISCLAIMER, DisclaimerWebExtensionPage)
  }

  private async showModal(settingsKey: SettingsKey, page: any): Promise<void> {
    const introduction = await this.storageProvider.get(settingsKey)
    if (!introduction) {
      return new Promise<void>(async resolve => {
        const modal = await this.modalController.create({
          component: page
        })
        modal
          .onDidDismiss()
          .then(async () => {
            await this.storageProvider.set(settingsKey, true)
            resolve(undefined)
          })
          .catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
        modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
      })
    } else {
      return Promise.resolve()
    }
  }
}
