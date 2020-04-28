import { Injectable, Inject } from '@angular/core'
import { ModalController, Platform, ToastController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ReplaySubject } from 'rxjs'
import { take } from 'rxjs/operators'
import { PermissionsPlugin, PushNotificationsPlugin, PushNotification, PushNotificationToken, PermissionType } from '@capacitor/core'

import { IntroductionPushPage } from '../../pages/introduction-push/introduction-push'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { SettingsKey, StorageProvider } from '../storage/storage'

import { PushBackendProvider } from './../push-backend/push-backend'

import { PERMISSIONS_PLUGIN, PUSH_NOTIFICATIONS_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'

@Injectable({
  providedIn: 'root'
})
export class PushProvider {
  private readonly registrationId: ReplaySubject<string> = new ReplaySubject(1)
  private registerCalled: boolean = false

  constructor(
    private readonly platform: Platform,
    private readonly translate: TranslateService,
    private readonly pushBackendProvider: PushBackendProvider,
    private readonly storageProvider: StorageProvider,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    @Inject(PERMISSIONS_PLUGIN) private readonly permissions: PermissionsPlugin,
    @Inject(PUSH_NOTIFICATIONS_PLUGIN) private readonly pushNotifications: PushNotificationsPlugin
  ) {
    this.initPush()
  }

  public notificationCallback = (_notification: PushNotification): void => undefined

  public async initPush(): Promise<void> {
    await this.platform.ready()

    if (!this.platform.is('hybrid')) {
      return
    }

    const hasPermissions = await this.hasPermissions()

    if (hasPermissions) {
      await this.register()
    }
  }

  public async setupPush() {
    await this.platform.ready()

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

        modal.onDidDismiss().then(result => {
          if (result.data) {
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

    this.pushNotifications.addListener('pushNotificationReceived', (notification: PushNotification) => {
      console.debug('Received a notification', notification)
      this.toastController
        .create({
          message: `${notification.title}: ${notification.body}`,
          buttons: [
            {
              text: 'Ok',
              role: 'cancel'
            }
          ],
          duration: 3000,
          position: 'top'
        })
        .then(toast => {
          toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
        })

      if (this.notificationCallback) {
        this.notificationCallback(notification)
      }
    })

    this.pushNotifications.addListener('registration', (token: PushNotificationToken) => {
      console.debug('device registered', token)
      this.registrationId.next(token.value)
    })

    this.pushNotifications.addListener('registrationError', error => {
      console.error('Error with Push plugin', error)
      handleErrorSentry(ErrorCategory.PUSH)(error)
    })

    await this.pushNotifications.register()
  }

  private async hasPermissions(): Promise<boolean> {
    const result = await this.permissions.query({ name: PermissionType.Notifications })
    return result.state === 'granted'
  }
}
