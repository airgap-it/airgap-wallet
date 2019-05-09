import { Component } from '@angular/core'
import { ModalController } from '@ionic/angular'
import { handleErrorSentry, ErrorCategory } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-introduction-push',
  templateUrl: 'introduction-push.html',
  styleUrls: ['./introduction-push.scss']
})
export class IntroductionPushPage {
  constructor(public viewCtrl: ModalController) {}

  dismiss(askForPermissions: boolean = false) {
    this.viewCtrl.dismiss(askForPermissions).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  promptForPushPermission() {
    this.dismiss(true)
  }
}
