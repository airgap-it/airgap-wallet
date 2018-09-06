import { Component } from '@angular/core'
import { Events, ModalController } from 'ionic-angular'

import { IntroductionPage } from '../introduction/introduction'
import { PortfolioPage } from '../portfolio/portfolio'
import { ScanPage } from '../scan/scan'
import { SettingsPage } from '../settings/settings'

import { Storage } from '@ionic/storage'
@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {

  tab1Root = PortfolioPage
  tab2Root = ScanPage
  tab3Root = SettingsPage

  constructor(public modalController: ModalController, private storage: Storage, private events: Events) {
    this.storage.get('introduction').then((introduction) => {
      if (!introduction) {
        setTimeout(
          () => {
            this.storage.set('introduction', true)
          },
          3000)
        const modal = this.modalController.create(IntroductionPage)
        modal.onDidDismiss(() => {
          this.events.publish('scan:start')
        })
        modal.present()
      }
    })
  }
}
