import { PushBackendProvider } from './../push-backend/push-backend'
import { Injectable } from '@angular/core'
import { NotificationEventResponse, Push, PushObject, PushOptions, RegistrationEventResponse } from '@ionic-native/push'
import { TranslateService } from '@ngx-translate/core'
import { handleErrorSentry, ErrorCategory } from '../sentry-error-handler/sentry-error-handler'
import { Platform } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ReplaySubject } from 'rxjs'
import { take } from 'rxjs/operators'

@Injectable()
export class PushProvider {
  private registrationId: ReplaySubject<string> = new ReplaySubject(1)

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
    private readonly pushBackendProvider: PushBackendProvider
  ) {
    this.initPush()
  }

  public async initPush(): Promise<void> {
    if (!this.platform.is('cordova')) {
      return
    }

    const { isEnabled }: { isEnabled: boolean } = await this.push.hasPermission()

    if (isEnabled) {
      this.register()
    } else {
      this.register()
    }
  }

  private async register(): Promise<void> {
    const hasRegistrationId = !(await this.registrationId.isEmpty().toPromise())
    console.log('hasRegistrationId', hasRegistrationId)

    if (hasRegistrationId) {
      return
    }

    const pushObject: PushObject = this.push.init(this.options)

    pushObject.on('notification').subscribe(async (notification: NotificationEventResponse) => {
      console.log('Received a notification', notification)
      // TODO: Handle push inside app?
    })

    pushObject.on('registration').subscribe(async (registration: RegistrationEventResponse) => {
      console.log('device registered', registration)
      this.registrationId.next(registration.registrationId)
    })

    pushObject.on('error').subscribe((error: Error) => {
      console.error('Error with Push plugin', error)
      handleErrorSentry(ErrorCategory.PUSH)(error)
    })
  }

  async registerWallets(wallets: AirGapMarketWallet[]) {
    console.log('register wallets')

    this.registrationId.pipe(take(1)).subscribe(registrationId => {
      const languageCode: string = this.translate.getBrowserCultureLang()

      const pushRegisterRequests = wallets.map(wallet => ({
        address: wallet.receivingPublicAddress,
        identifier: wallet.protocolIdentifier,
        pushToken: registrationId,
        languageCode: languageCode
      }))

      this.pushBackendProvider.registerPushMany(pushRegisterRequests).catch(handleErrorSentry(ErrorCategory.PUSH))
      if (!this.registrationId) {
        console.error('No registration token found')
        return
      }
    })
  }

  async unregisterWallets(wallets: AirGapMarketWallet[]) {
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
}
