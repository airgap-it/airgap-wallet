import { Injectable, Inject } from '@angular/core'
import { AlertController } from '@ionic/angular'
import { StorageProvider, SettingsKey } from './../storage/storage'
import { TranslateService } from '@ngx-translate/core'
import { AppPlugin } from '@capacitor/core'
import { AirGapMarketWallet, IACMessageType, IAirGapTransaction } from 'airgap-coin-lib'

import { serializedDataToUrlString } from '../../utils/utils'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { SerializerService } from '../serializer/serializer.service'

import { AccountProvider } from './../account/account.provider'
import { isString } from 'util'

import { APP_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'

@Injectable({
  providedIn: 'root'
})
export class DeepLinkProvider {
  constructor(
    private readonly alertCtrl: AlertController,
    private readonly translateService: TranslateService,
    private readonly accountProvider: AccountProvider,
    private readonly serializerService: SerializerService,
    @Inject(APP_PLUGIN) private readonly app: AppPlugin,
    private readonly storageProvider: StorageProvider
  ) {}

  public sameDeviceDeeplink(url: string | string[] = 'airgap-vault://'): Promise<void> {
    const deeplinkUrl: string = isString(url) && url.includes('://') ? url : serializedDataToUrlString(url)

    return new Promise((resolve, reject) => {
      this.app
        .openUrl({ url: deeplinkUrl })
        .then(() => {
          console.log('Deeplink called')
          resolve()
        })
        .catch(error => {
          console.error('deeplink used', deeplinkUrl)
          console.error(error)
          this.showAppNotFoundAlert()

          reject()
        })
    })
  }

  public showDeeplinkOnlyOnDevicesAlert(): void {
    this.translateService
      .get(['deep-link.not-supported-alert.title', 'deep-link.not-supported-alert.message', 'deep-link.not-supported-alert.ok'])
      .subscribe(async translated => {
        const alert: HTMLIonAlertElement = await this.alertCtrl.create({
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
        alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
      })
  }

  public showAppNotFoundAlert(): void {
    this.translateService
      .get(['deep-link.app-not-found.title', 'deep-link.app-not-found.message', 'deep-link.app-not-found.ok'], {
        otherAppName: 'AirGap Vault'
      })
      .subscribe(async translated => {
        const alert: HTMLIonAlertElement = await this.alertCtrl.create({
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
        alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
      })
  }

  public async walletDeepLink(): Promise<{ wallet: AirGapMarketWallet; airGapTxs: IAirGapTransaction[]; serializedTx: string[] }> {
    this.storageProvider.set(SettingsKey.DEEP_LINK, true).catch(handleErrorSentry(ErrorCategory.STORAGE))
    const url: URL = new URL(location.href)
    const publicKey: string = url.searchParams.get('publicKey')
    const rawUnsignedTx: unknown = JSON.parse(url.searchParams.get('rawUnsignedTx'))
    const identifier: string = url.searchParams.get('identifier')
    console.log('publicKey', publicKey)
    console.log('rawUnsignedTx', rawUnsignedTx)
    console.log('identifier', identifier)

    const wallet: AirGapMarketWallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(publicKey, identifier)
    const airGapTxs: IAirGapTransaction[] = await wallet.coinProtocol.getTransactionDetails({
      publicKey: wallet.publicKey,
      transaction: rawUnsignedTx
    })

    const serializedTx: string[] = await this.serializerService.serialize([
      {
        protocol: wallet.coinProtocol.identifier,
        type: IACMessageType.TransactionSignRequest,
        payload: {
          publicKey: wallet.publicKey,
          transaction: rawUnsignedTx as any,
          callback: 'airgap-wallet://?d='
        }
      }
    ])

    return {
      wallet,
      airGapTxs,
      serializedTx
    }
  }
}
