import { SyncProtocolUtils, EncodedType } from 'airgap-coin-lib'
import { AccountProvider } from './../account/account.provider'
import { Injectable } from '@angular/core'
import { Platform, AlertController } from 'ionic-angular'
import { handleErrorSentry, ErrorCategory } from '../sentry-error-handler/sentry-error-handler'
import { TranslateService } from '@ngx-translate/core'

declare let window: any

@Injectable()
export class DeepLinkProvider {
  constructor(
    private platform: Platform,
    private alertCtrl: AlertController,
    private translateService: TranslateService,
    private accountProvider: AccountProvider
  ) {}

  sameDeviceDeeplink(url: string = 'airgap-vault://'): Promise<void> {
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

  showDeeplinkOnlyOnDevicesAlert() {
    this.translateService
      .get(['deep-link.not-supported-alert.title', 'deep-link.not-supported-alert.message', 'deep-link.not-supported-alert.ok'])
      .subscribe(translated => {
        let alert = this.alertCtrl.create({
          title: translated['deep-link.not-supported-alert.title'],
          message: translated['deep-link.not-supported-alert.message'],
          enableBackdropDismiss: false,
          buttons: [
            {
              text: translated['deep-link.not-supported-alert.ok'],
              role: 'cancel'
            }
          ]
        })
        alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
      })
  }

  showAppNotFoundAlert() {
    this.translateService
      .get(['deep-link.app-not-found.title', 'deep-link.app-not-found.message', 'deep-link.app-not-found.ok'], {
        otherAppName: 'AirGap Vault'
      })
      .subscribe(translated => {
        let alert = this.alertCtrl.create({
          title: translated['deep-link.app-not-found.title'],
          message: translated['deep-link.app-not-found.message'],
          enableBackdropDismiss: false,
          buttons: [
            {
              text: translated['deep-link.app-not-found.ok'],
              role: 'cancel'
            }
          ]
        })
        alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
      })
  }
  // TODO: Move to provider
  async walletDeepLink() {
    let url = new URL(location.href)
    let publicKey = url.searchParams.get('publicKey')
    let rawUnsignedTx = JSON.parse(url.searchParams.get('rawUnsignedTx'))
    let identifier = url.searchParams.get('identifier')
    console.log('publicKey', publicKey)
    console.log('rawUnsignedTx', rawUnsignedTx)
    console.log('identifier', identifier)

    let wallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(publicKey, identifier)
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
      wallet: wallet,
      airGapTx: airGapTx,
      serializedTx: serializedTx
    }
  }
}
