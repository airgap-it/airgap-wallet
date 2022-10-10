import { APP_INFO_PLUGIN, AppInfoPlugin } from '@airgap/angular-core'
import { Inject, Injectable } from '@angular/core'
import { PermissionStatus, PushNotificationSchema, PushNotificationsPlugin, Token } from '@capacitor/push-notifications'
import { ModalController, Platform, ToastController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { ReplaySubject } from 'rxjs'
import { take } from 'rxjs/operators'
import { PUSH_NOTIFICATIONS_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'

import { IntroductionPushPage } from '../../pages/introduction-push/introduction-push'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from '../storage/storage'

import { PushBackendProvider } from './../push-backend/push-backend'

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
    private readonly storageProvider: WalletStorageService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    @Inject(APP_INFO_PLUGIN) private readonly appInfoPlugin: AppInfoPlugin,
    @Inject(PUSH_NOTIFICATIONS_PLUGIN) private readonly pushNotifications: PushNotificationsPlugin
  ) {
    this.initPush()
  }

  public notificationCallback = (_notification: PushNotificationSchema): void => undefined

  public async initPush(): Promise<void> {
    await this.platform.ready()
    const isSupported = await this.isSupported()

    if (!isSupported) {
      return
    }

    const permissionStatus: PermissionStatus = await this.checkPermissions()

    if (permissionStatus.receive === 'granted') {
      await this.register()
    }
  }

  public async setupPush() {
    await this.platform.ready()
    const isSupported = await this.isSupported()

    if (!isSupported) {
      return
    }

    if (this.platform.is('android')) {
      this.register()
    } else if (this.platform.is('ios')) {
      // On iOS, show a modal why we need permissions
      const hasShownPushModal = await this.storageProvider.get(WalletStorageKey.PUSH_INTRODUCTION)
      if (!hasShownPushModal) {
        await this.storageProvider.set(WalletStorageKey.PUSH_INTRODUCTION, true)
        const modal = await this.modalController.create({
          component: IntroductionPushPage
        })

        modal.onDidDismiss().then((result) => {
          if (result.data) {
            this.register()
          }
        })

        modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
      }
    }
  }

  public async registerWallets(wallets: AirGapMarketWallet[]) {
    this.registrationId.pipe(take(1)).subscribe((registrationId) => {
      const languageCode: string = this.translate.getBrowserCultureLang()

      const pushRegisterRequests = wallets.map((wallet) => ({
        address: wallet.receivingPublicAddress,
        identifier: wallet.protocol.identifier,
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
    this.registrationId.pipe(take(1)).subscribe((registrationId) => {
      wallets.forEach((wallet) => {
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
      .unregisterPush(wallet.protocol.identifier, wallet.receivingPublicAddress, registrationId)
      .catch(handleErrorSentry(ErrorCategory.PUSH))
  }

  private async register(): Promise<void> {
    if (this.registerCalled) {
      return
    }

    const permissionStatus: PermissionStatus = await this.requestPermissions()
    if (permissionStatus.receive !== 'granted') {
      return
    }

    this.registerCalled = true

    this.pushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
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
        .then((toast) => {
          toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
        })

      if (this.notificationCallback) {
        this.notificationCallback(notification)
      }
    })

    this.pushNotifications.addListener('registration', (token: Token) => {
      console.debug('device registered', token)
      this.registrationId.next(token.value)
    })

    this.pushNotifications.addListener('registrationError', (error) => {
      console.error('Error with Push plugin', error)
      handleErrorSentry(ErrorCategory.PUSH)(error)
    })

    await this.pushNotifications.register()
  }

  private async checkPermissions(): Promise<PermissionStatus> {
    return this.pushNotifications.checkPermissions()
  }

  private async requestPermissions(): Promise<PermissionStatus> {
    const permissionStatus: PermissionStatus = await this.checkPermissions()
    if (permissionStatus.receive === 'granted') {
      return permissionStatus
    }

    return this.pushNotifications.requestPermissions()
  }

  private async isSupported(): Promise<boolean> {
    if (this.platform.is('hybrid')) {
      const info = await this.appInfoPlugin.get()
      return this.platform.is('ios') || (this.platform.is('android') && info.productFlavor !== 'fdroid')
    } else {
      return false
    }
  }
}
