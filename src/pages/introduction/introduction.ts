import { Component } from '@angular/core'
import { ViewController, ModalController } from 'ionic-angular'
import { IntroductionDownloadPage } from '../introduction-download/introduction-download'

declare var cordova: any

@Component({
  selector: 'page-introduction',
  templateUrl: 'introduction.html'
})
export class IntroductionPage {
  public security: string = 'highest'

  constructor(private viewController: ViewController, public modalController: ModalController) {}

  public dismiss() {
    this.viewController.dismiss()
  }

  public openIntroductionDownloadPage() {
    const modal = this.modalController.create(IntroductionDownloadPage)

    modal.onDidDismiss(shouldCloseAllModals => {
      if (shouldCloseAllModals) {
        this.dismiss()
      }
    })

    modal.present()
  }
}
