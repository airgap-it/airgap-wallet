import { Component } from '@angular/core'
import { IonTabs, ModalController, Platform } from '@ionic/angular'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from '../../services/storage/storage'
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
  private activeTab?: HTMLElement

  public tab1Root = PortfolioPage
  public tab2Root = ScanPage
  public tab3Root = ExchangePage
  public tab4Root = SettingsPage

  public isMobile = false

  constructor(
    public modalController: ModalController,
    private readonly storageProvider: WalletStorageService,
    private readonly platform: Platform
  ) {
    this.showIntroductions().catch(handleErrorSentry(ErrorCategory.OTHER))
    this.isMobile = this.platform.is('android') || this.platform.is('ios')
  }

  private async showIntroductions() {
    const alreadyOpenByDeepLink = await this.storageProvider.get(WalletStorageKey.DEEP_LINK)
    if (!alreadyOpenByDeepLink) {
      await this.showWalletIntroduction().catch(console.error)
    }
  }

  private async showWalletIntroduction() {
    return this.showModal(WalletStorageKey.WALLET_INTRODUCTION, IntroductionPage)
  }

  private async showModal(settingsKey: WalletStorageKey, page: any): Promise<void> {
    const introduction = await this.storageProvider.get(settingsKey)
    if (!introduction) {
      return new Promise<void>(async (resolve) => {
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

  tabChange(tabsRef: IonTabs) {
    this.activeTab = tabsRef.outlet.activatedView.element
  }

  ionViewWillEnter() {
    this.propagateToActiveTab('ionViewWillEnter')
  }

  private propagateToActiveTab(eventName: string) {
    if (this.activeTab) {
      this.activeTab.dispatchEvent(new CustomEvent(eventName))
    }
  }
}
