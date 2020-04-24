import { Component } from '@angular/core'
import { ModalController, Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-introduction-download',
  templateUrl: 'introduction-download.html'
})
export class IntroductionDownloadPage {
  public appStoreText: string = 'android-device-iOS_text'
  public playStoreText: string = 'iOS-device-android_text'
  public isIOS: boolean = true

  constructor(
    private readonly platform: Platform,
    public viewController: ModalController,
    private readonly translateService: TranslateService
  ) {
    this.isIOS = this.platform.is('ios')

    if (!this.translateService.currentLang.startsWith('en')) {
      this.appStoreText = 'app-store_text'
      this.playStoreText = 'play-store_text'
    } else {
      if (this.platform.is('ios')) {
        this.appStoreText = 'iOS-device-iOS_text'
        this.playStoreText = 'iOS-device-android_text'
      } else if (this.platform.is('android')) {
        this.appStoreText = 'android-device-iOS_text'
        this.playStoreText = 'android-device-android_text'
      }
    }
  }

  public dismiss(shouldCloseAllModals: boolean = false): void {
    this.viewController.dismiss(shouldCloseAllModals).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public downloadAndroid(): void {
    if (this.platform.is('android')) {
      window.open('https://play.google.com/store/apps/details?id=it.airgap.vault', '_system')
    } else if (this.platform.is('hybrid')) {
      window.open('https://play.google.com/store/apps/details?id=it.airgap.vault', '_system')
    } else {
      window.open('https://play.google.com/store/apps/details?id=it.airgap.vault', '_blank')
    }
    this.dismiss(true)
  }

  public downloadIos(): void {
    if (this.platform.is('ios')) {
      window.open('itms-apps://itunes.apple.com/app/id1417126841', '_system')
    } else if (this.platform.is('hybrid')) {
      window.open('https://itunes.apple.com/us/app/airgap-vault-secure-secrets/id1417126841?mt=8', '_system')
    } else {
      window.open('https://itunes.apple.com/us/app/airgap-vault-secure-secrets/id1417126841?mt=8', '_blank')
    }
    this.dismiss(true)
  }

  public downloadDistribution(): void {
    if (this.platform.is('hybrid')) {
      window.open('https://github.com/airgap-it/airgap-distro', '_system')
    } else {
      window.open('https://github.com/airgap-it/airgap-distro', '_blank')
    }
    this.dismiss(true)
  }

  public openGuide(): void {
    if (this.platform.is('hybrid')) {
      window.open('https://medium.com/airgap-it/airgap-the-step-by-step-guide-c4c3d3fe9a05', '_system')
    } else {
      window.open('https://medium.com/airgap-it/airgap-the-step-by-step-guide-c4c3d3fe9a05', '_blank')
    }
    this.dismiss(true)
  }
}
