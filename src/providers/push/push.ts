import { PushBackendProvider } from './../push-backend/push-backend'
import { AccountProvider } from './../account/account.provider'
import { Injectable } from '@angular/core'
import { NotificationEventResponse, Push, PushObject, PushOptions, RegistrationEventResponse } from '@ionic-native/push'
import { TranslateService } from '@ngx-translate/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'

@Injectable()
export class PushProvider {
  private isRegistered: boolean = false
  private readonly options: PushOptions = {
    android: {
      senderID: '',
      sound: false,
      icon: 'notification',
      clearBadge: true
    },
    ios: {
      alert: 'true',
      badge: true,
      sound: 'false'
    },
    windows: {}
  }

  constructor(
    private readonly push: Push,
    private readonly translate: TranslateService,
    private accountProvider: AccountProvider,
    private pushBackendProvider: PushBackendProvider
  ) {
    this.initPush()
  }

  public async initPush(): Promise<void> {
    if (this.isRegistered) {
      return
    }

    const { isEnabled }: { isEnabled: boolean } = await this.push.hasPermission()

    if (isEnabled) {
      alert('We have permission to send push notifications')
      this.register()
    } else {
      this.register()
      alert('We do not have permission to send push notifications')
    }
  }

  private async register(): Promise<void> {
    const pushObject: PushObject = this.push.init(this.options)

    pushObject.on('notification').subscribe(async (notification: NotificationEventResponse) => {
      console.log('Received a notification', notification)

      // TODO: Handle push inside app?
      alert(notification.message)
    })

    pushObject.on('registration').subscribe(async (registration: RegistrationEventResponse) => {
      // TODO implement communication with backend
      /*
      this.accountProvider.wallets.subscribe(async (wallets: AirGapMarketWallet[]) => {
        const languageCode: string = this.translate.getBrowserCultureLang()
        await this.pushBackendProvider.registerPush(
          wallets[0].protocolIdentifier,
          wallets[0].receivingPublicAddress,
          registration.registrationId,
          languageCode
        )
      })
      */
      console.log('device registered', registration)
    })

    pushObject.on('error').subscribe((error: Error) => {
      console.error('Error with Push plugin', error)
      // TODO: Send error to sentry?
    })

    this.isRegistered = true
  }
}
