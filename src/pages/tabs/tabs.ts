import { Component } from '@angular/core'
import { Events, ModalController } from 'ionic-angular'

import { IntroductionPage } from '../introduction/introduction'
import { PortfolioPage } from '../portfolio/portfolio'
import { ScanPage } from '../scan/scan'
import { SettingsPage } from '../settings/settings'
import { ExchangePage } from '../exchange/exchange'

import { StorageProvider, SettingsKey } from '../../providers/storage/storage'
@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {
  tab1Root = PortfolioPage
  tab2Root = ScanPage
  tab3Root = ExchangePage
  tab4Root = SettingsPage

  constructor(public modalController: ModalController, private storageProvider: StorageProvider) {
    this.showIntroduction().catch(console.error)
  }

  private async showIntroduction() {
    const introduction = await this.storageProvider.get(SettingsKey.INTRODUCTION)
    if (!introduction) {
      setTimeout(async () => {
        await this.storageProvider.set(SettingsKey.INTRODUCTION, true)
      }, 3000)
      const modal = this.modalController.create(IntroductionPage)
      modal.present().catch(console.error)
    }
  }
}
