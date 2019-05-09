import { Component } from '@angular/core'
import { ModalController, Platform } from '@ionic/angular'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-introduction-download',
  templateUrl: 'introduction-download.html'
})
export class IntroductionDownloadPage {
  constructor(private readonly platform: Platform, public viewController: ModalController) {}

  public dismiss(shouldCloseAllModals = false) {
    this.viewController.dismiss(shouldCloseAllModals).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public downloadAndroid() {
    if (this.platform.is('android')) {
      window.open('https://play.google.com/store/apps/details?id=it.airgap.vault', '_system')
    } else if (this.platform.is('cordova')) {
      window.open('https://play.google.com/store/apps/details?id=it.airgap.vault', '_system')
    } else {
      window.open('https://play.google.com/store/apps/details?id=it.airgap.vault', '_blank')
    }
    this.dismiss(true)
  }

  public downloadIos() {
    if (this.platform.is('ios')) {
      window.open('itms-apps://itunes.apple.com/app/id1417126841', '_system')
    } else if (this.platform.is('cordova')) {
      window.open('https://itunes.apple.com/us/app/airgap-vault-secure-secrets/id1417126841?mt=8', '_system')
    } else {
      window.open('https://itunes.apple.com/us/app/airgap-vault-secure-secrets/id1417126841?mt=8', '_blank')
    }
    this.dismiss(true)
  }

  public downloadDistribution() {
    if (this.platform.is('cordova')) {
      window.open('https://github.com/airgap-it/airgap-distro', '_system')
    } else {
      window.open('https://github.com/airgap-it/airgap-distro', '_blank')
    }
    this.dismiss(true)
  }
}
