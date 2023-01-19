import { ProtocolService } from '@airgap/angular-core'
import { Router } from '@angular/router'
import { AlertController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { AirGapMarketWallet, MainProtocolSymbols } from '@airgap/coinlib-core'
import { Action } from '@airgap/coinlib-core/actions/Action'

import { ShortenStringPipe } from '../../pipes/shorten-string/shorten-string.pipe'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

export interface AirGapTezosMigrateActionContext {
  alertCtrl: AlertController
  translateService: TranslateService
  protocolService: ProtocolService
  wallet: AirGapMarketWallet
  dataService: DataService
  router: Router
}

export class AirGapTezosMigrateAction extends Action<void, AirGapTezosMigrateActionContext> {
  protected perform(): Promise<void> {
    return new Promise(async (resolve) => {
      const mainProtocol = await this.context.protocolService.getProtocol(MainProtocolSymbols.XTZ)
      const mainAddress = await mainProtocol.getAddressFromPublicKey(this.context.wallet.publicKey)
      const shortenString = new ShortenStringPipe()
      this.context.alertCtrl
        .create({
          header: this.context.translateService.instant('account-transaction-list.migrate-alert.header'),
          message: `Do you want to transfer <span class=\"style__strong color__primary\">${this.context.wallet
            .getCurrentBalance()
            .shiftedBy(
              -1 * this.context.wallet.protocol.decimals
            )} XTZ</span> </strong> from <span class=\"style__strong color__primary\"> ${shortenString.transform(
            this.context.wallet.receivingPublicAddress
          )} </span> to <span class=\"style__strong color__primary\"> ${shortenString.transform(mainAddress.address)}</span>?`,
          buttons: [
            {
              text: this.context.translateService.instant('account-transaction-list.migrate-alert.cancel'),
              role: 'cancel',
              handler: (): void => {
                resolve()
              }
            },
            {
              text: this.context.translateService.instant('account-transaction-list.migrate-alert.confirm'),
              handler: (): void => {
                const info = {
                  wallet: this.context.wallet,
                  address: mainAddress.address,
                  forceMigration: true
                }
                this.context.dataService.setData(DataServiceKey.DETAIL, info)
                this.context.router
                  .navigateByUrl(
                    `/transaction-prepare/${DataServiceKey.DETAIL}/${info.wallet.publicKey}/${info.wallet.protocol.identifier}/${
                      info.wallet.addressIndex
                    }/${info.address}/${0}/undefined/${info.forceMigration ? 'forced' : 'not_forced'}`
                  )
                  .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
                resolve()
              }
            }
          ]
        })
        .then((alert: HTMLIonAlertElement) => {
          alert.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        })
        .catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
    })
  }
}
