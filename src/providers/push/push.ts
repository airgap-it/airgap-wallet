import { PushBackendProvider } from './../push-backend/push-backend'
import { AccountProvider } from './../account/account.provider'
import { Injectable } from '@angular/core'
import { NotificationEventResponse, Push, PushObject, PushOptions, RegistrationEventResponse } from '@ionic-native/push'
import { TranslateService } from '@ngx-translate/core'
import { handleErrorSentry, ErrorCategory } from '../sentry-error-handler/sentry-error-handler'

@Injectable()
export class PushProvider {
  private isRegistered: boolean = false
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
      this.register() // TODO: Place register in UI Flow
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
      // TODO: Enable other currencies
      const wallets = this.accountProvider.getWalletList().filter(wallet => wallet.protocolIdentifier.startsWith('eth'))
      const languageCode: string = this.translate.getBrowserCultureLang()
      if (wallets.length > 0) {
        wallets.forEach(wallet => {
          this.pushBackendProvider
            .registerPush(wallet.protocolIdentifier, wallet.receivingPublicAddress, registration.registrationId, languageCode)
            .catch(handleErrorSentry(ErrorCategory.PUSH))
        })
      }
      console.log('device registered', registration)
      alert(registration.registrationId)
    })

    pushObject.on('error').subscribe((error: Error) => {
      console.error('Error with Push plugin', error)
      // TODO: Send error to sentry?
    })

    this.isRegistered = true
  }
}
