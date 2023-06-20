import { Component } from '@angular/core'
import { ModalController } from '@ionic/angular'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from 'src/app/services/storage/storage'

@Component({
  selector: 'airgap-isolated-modules-onboarding-page',
  templateUrl: './isolated-modules-onboarding.page.html',
  styleUrls: ['./isolated-modules-onboarding.page.scss']
})
export class IsolatedModulesOnboardingPage {
  public constructor(private readonly storageSerivce: WalletStorageService, private readonly modalController: ModalController) {}

  public back() {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }

  public async acknowledge() {
    await this.storageSerivce
      .set(WalletStorageKey.ISOLATED_MODULES_ONBOARDING_DISABLED, true)
      .catch(handleErrorSentry(ErrorCategory.STORAGE))

    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }
}
