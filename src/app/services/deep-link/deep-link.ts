import { Injectable } from '@angular/core'
import { AlertController, Platform } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { EncodedType, SyncProtocolUtils } from 'airgap-coin-lib'

import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

import { AccountProvider } from './../account/account.provider'

declare let window: any

@Injectable({
  providedIn: 'root'
})
export class DeepLinkProvider {
  constructor(
    private readonly platform: Platform,
    private readonly alertCtrl: AlertController,
    private readonly translateService: TranslateService,
    private readonly accountProvider: AccountProvider
  ) {}

  public sameDeviceDeeplink(url: string = 'airgap-vault://'): Promise<void> {
    return new Promise((resolve, reject) => {
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
        this.showDeeplinkOnlyOnDevicesAlert()

        return reject()
      }

      sApp.start(
        () => {
          console.log('Deeplink called')
          resolve()
        },
        error => {
          console.error('deeplink used', url)
          console.error(error)
          this.showAppNotFoundAlert()

          return reject()
        }
      )
    })
  }

  public showDeeplinkOnlyOnDevicesAlert() {
    this.translateService
      .get(['deep-link.not-supported-alert.title', 'deep-link.not-supported-alert.message', 'deep-link.not-supported-alert.ok'])
      .subscribe(translated => {
        const alert = this.alertCtrl
          .create({
            header: translated['deep-link.not-supported-alert.title'],
            message: translated['deep-link.not-supported-alert.message'],
            backdropDismiss: false,
            buttons: [
              {
                text: translated['deep-link.not-supported-alert.ok'],
                role: 'cancel'
              }
            ]
          })
          .then(alert => {
            alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
          })
      })
  }

  public showAppNotFoundAlert() {
    this.translateService
      .get(['deep-link.app-not-found.title', 'deep-link.app-not-found.message', 'deep-link.app-not-found.ok'], {
        otherAppName: 'AirGap Vault'
      })
      .subscribe(translated => {
        const alert = this.alertCtrl
          .create({
            header: translated['deep-link.app-not-found.title'],
            message: translated['deep-link.app-not-found.message'],
            backdropDismiss: false,
            buttons: [
              {
                text: translated['deep-link.app-not-found.ok'],
                role: 'cancel'
              }
            ]
          })
          .then(alert => {
            alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
          })
      })
  }
  // TODO: Move to provider
  public async walletDeepLink() {
    const url = new URL(location.href)
    const publicKey = url.searchParams.get('publicKey')
    const rawUnsignedTx = JSON.parse(url.searchParams.get('rawUnsignedTx'))
    const identifier = url.searchParams.get('identifier')
    console.log('publicKey', publicKey)
    console.log('rawUnsignedTx', rawUnsignedTx)
    console.log('identifier', identifier)

    const wallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(publicKey, identifier)
    const airGapTx = await wallet.coinProtocol.getTransactionDetails({
      publicKey: wallet.publicKey,
      transaction: rawUnsignedTx
    })

    const syncProtocol = new SyncProtocolUtils()
    const serializedTx = await syncProtocol.serialize({
      version: 1,
      protocol: wallet.coinProtocol.identifier,
      type: EncodedType.UNSIGNED_TRANSACTION,
      payload: {
        publicKey: wallet.publicKey,
        transaction: rawUnsignedTx,
        callback: 'airgap-wallet://?d='
      }
    })

    return {
      wallet,
      airGapTx,
      serializedTx
    }
  }
}
