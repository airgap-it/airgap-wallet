import { Component } from '@angular/core'
import { ModalController, Platform } from '@ionic/angular'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { IntroductionDownloadPage } from '../introduction-download/introduction-download'

@Component({
  selector: 'page-introduction',
  templateUrl: 'introduction.html',
  styleUrls: ['./introduction.scss']
})
export class IntroductionPage {
  public security: string = 'highest'
  public isDesktop: boolean = false

  constructor(public platform: Platform, public modalController: ModalController) {
    this.isDesktop = !this.platform.is('hybrid')
  }

  public dismiss() {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async openIntroductionDownloadPage() {
    const modal = await this.modalController.create({
      component: IntroductionDownloadPage
    })

    modal.dismiss((shouldCloseAllModals) => {
      if (shouldCloseAllModals) {
        this.dismiss()
      }
    })

    modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }
}
