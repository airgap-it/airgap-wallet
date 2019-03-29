import { Component } from '@angular/core'
import { ViewController } from 'ionic-angular'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-introduction-push',
  templateUrl: 'introduction-push.html'
})
export class IntroductionPushPage {
  constructor(public viewCtrl: ViewController) {}

  dismiss() {
    this.viewCtrl.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  promptForPushPermission() {
    this.dismiss()
  }
}
