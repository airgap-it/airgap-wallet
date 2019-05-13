import { Injectable } from '@angular/core'
import { NotificationEventResponse, Push, PushObject, PushOptions, RegistrationEventResponse } from '@ionic-native/push/ngx'
import { ModalController, Platform, ToastController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ReplaySubject } from 'rxjs'
import { take } from 'rxjs/operators'

import { IntroductionPushPage } from '../../pages/introduction-push/introduction-push'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../storage/storage'

import { PushBackendProvider } from './../push-backend/push-backend'

@Injectable({
  providedIn: 'root'
})
export class PushProvider {
  private readonly registrationId: ReplaySubject<string> = new ReplaySubject(1)
  private registerCalled: boolean = false

  private readonly options: PushOptions = {
    android: {},
    ios: {
      alert: 'true',
      badge: true,
      sound: 'false'
    },
    windows: {}
  }

  constructor(
    private readonly platform: Platform,
    private readonly push: Push,
    private readonly translate: TranslateService,
    private readonly pushBackendProvider: PushBackendProvider,
    private readonly storageProvider: StorageProvider,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController
  ) {
    this.initPush()
  }

  public async initPush(): Promise<void> {
    await this.platform.ready()

    if (!this.platform.is('cordova')) {
      return
    }

    const { isEnabled }: { isEnabled: boolean } = await this.push.hasPermission()

    if (isEnabled) {
      await this.register()
    }
  }

  public async setupPush() {
    if (this.platform.is('android')) {
      this.register()
    } else if (this.platform.is('ios')) {
      // On iOS, show a modal why we need permissions
      const hasShownPushModal = await this.storageProvider.get(SettingsKey.PUSH_INTRODUCTION)
      if (!hasShownPushModal) {
        await this.storageProvider.set(SettingsKey.PUSH_INTRODUCTION, true)
        const modal = await this.modalController.create({
          component: IntroductionPushPage
        })

        modal.dismiss(askForPermissions => {
          if (askForPermissions) {
            this.register()
          }
        })

        modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
      }
    }
  }

  public async registerWallets(wallets: AirGapMarketWallet[]) {
    console.log('register wallets')

    this.registrationId.pipe(take(1)).subscribe(registrationId => {
      const languageCode: string = this.translate.getBrowserCultureLang()

      const pushRegisterRequests = wallets.map(wallet => ({
        address: wallet.receivingPublicAddress,
        identifier: wallet.protocolIdentifier,
        pushToken: registrationId,
        languageCode
      }))

      this.pushBackendProvider.registerPushMany(pushRegisterRequests).catch(handleErrorSentry(ErrorCategory.PUSH))
      if (!this.registrationId) {
        console.error('No registration token found')

        return
      }
    })
  }

  public async unregisterWallets(wallets: AirGapMarketWallet[]) {
    console.log('unregister wallets')

    this.registrationId.pipe(take(1)).subscribe(registrationId => {
      wallets.forEach(wallet => {
        this.unregisterWallet(wallet, registrationId)
      })
    })
  }

  private async unregisterWallet(wallet: AirGapMarketWallet, registrationId: string) {
    if (!this.registrationId) {
      console.error('No registration token found')

      return
    }

    this.pushBackendProvider
      .unregisterPush(wallet.protocolIdentifier, wallet.receivingPublicAddress, registrationId)
      .catch(handleErrorSentry(ErrorCategory.PUSH))
  }

  private async register(): Promise<void> {
    if (this.registerCalled) {
      return
    }

    this.registerCalled = true

    const pushObject: PushObject = this.push.init(this.options)

    pushObject.on('notification').subscribe(async (notification: NotificationEventResponse) => {
      console.debug('Received a notification', notification)
      this.toastController
        .create({
          message: `${notification.title}: ${notification.message}`,
          showCloseButton: true,
          duration: 3000,
          position: 'top'
        })
        .then(toast => {
          toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
        })
    })

    pushObject.on('registration').subscribe(async (registration: RegistrationEventResponse) => {
      console.debug('device registered', registration)
      this.registrationId.next(registration.registrationId)
    })

    pushObject.on('error').subscribe((error: Error) => {
      console.error('Error with Push plugin', error)
      handleErrorSentry(ErrorCategory.PUSH)(error)
    })
  }
}
