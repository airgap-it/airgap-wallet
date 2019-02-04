import { Component } from '@angular/core'
import { ViewController, ModalController, Platform } from 'ionic-angular'
import { IntroductionDownloadPage } from '../introduction-download/introduction-download'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-introduction',
  templateUrl: 'introduction.html'
})
export class IntroductionPage {
  public security: string = 'highest'
  public isBrowser: boolean = false

  constructor(public platform: Platform, private viewController: ViewController, public modalController: ModalController) {
    this.isBrowser = !this.platform.is('cordova')
  }

  public dismiss() {
    this.viewController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openIntroductionDownloadPage() {
    const modal = this.modalController.create(IntroductionDownloadPage)

    modal.onDidDismiss(shouldCloseAllModals => {
      if (shouldCloseAllModals) {
        this.dismiss()
      }
    })

    modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }
}
