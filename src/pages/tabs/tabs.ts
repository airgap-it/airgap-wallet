import { Component } from '@angular/core'
import { Events, ModalController } from 'ionic-angular'

import { IntroductionPage } from '../introduction/introduction'
import { PortfolioPage } from '../portfolio/portfolio'
import { ScanPage } from '../scan/scan'
import { SettingsPage } from '../settings/settings'

import { SettingsProvider, SettingsKey } from '../../providers/settings/settings'
@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {
  tab1Root = PortfolioPage
  tab2Root = ScanPage
  tab3Root = SettingsPage

  constructor(public modalController: ModalController, private settingsProvider: SettingsProvider, private events: Events) {
    this.showIntroduction().catch(console.error)
  }

  private async showIntroduction() {
    const introduction = await this.settingsProvider.get(SettingsKey.INTRODUCTION)
    if (!introduction) {
      setTimeout(async () => {
        await this.settingsProvider.set(SettingsKey.INTRODUCTION, true)
      }, 3000)
      const modal = this.modalController.create(IntroductionPage)
      modal.onDidDismiss(() => {
        this.events.publish('scan:start')
      })
      modal.present().catch(console.error)
    }
  }
}
