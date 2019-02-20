import { Injectable } from '@angular/core'
import { Platform, AlertController } from 'ionic-angular'
import { handleErrorSentry, ErrorCategory } from '../sentry-error-handler/sentry-error-handler'

declare let window: any

@Injectable()
export class DeepLinkProvider {
  constructor(private platform: Platform, private alertCtrl: AlertController) {}

  sameDeviceDeeplink(url: string = 'airgap-vault://') {
    let sApp

    if (this.platform.is('android')) {
      sApp = window.startApp.set({
        action: 'ACTION_VIEW',
        uri: url,
        flags: ['FLAG_ACTIVITY_NEW_TASK']
      })
    } else if (this.platform.is('ios')) {
      sApp = window.startApp.set(url)
    } else {
      console.log('same device sync only supported on devices')
      let alert = this.alertCtrl.create({
        title: 'Oops',
        message: 'Deeplinking is only supported on devices.',
        enableBackdropDismiss: false,
        buttons: [
          {
            text: 'Ok',
            role: 'cancel'
          }
        ]
      })
      alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
      return
    }

    sApp.start(
      () => {
        console.log('OK')
      },
      error => {
        console.error('deeplink used', url)
        console.error(error)
        alert('Oops. Something went wrong here. Do you have AirGap Wallet installed on the same Device?')
      }
    )
  }
}
