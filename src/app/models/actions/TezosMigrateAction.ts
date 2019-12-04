import { Router } from '@angular/router'
import { AlertController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { Action } from 'airgap-coin-lib/dist/actions/Action'

import { ShortenStringPipe } from '../../pipes/shorten-string/shorten-string.pipe'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

export interface AirGapTezosMigrateActionContext {
  alertCtrl: AlertController
  translateService: TranslateService
  wallet: AirGapMarketWallet
  mainWallet: AirGapMarketWallet
  dataService: DataService
  router: Router
}

export class AirGapTezosMigrateAction extends Action<void, AirGapTezosMigrateActionContext> {
  protected perform(): Promise<void> {
    return new Promise(resolve => {
      const shortenString = new ShortenStringPipe()
      this.context.alertCtrl
        .create({
          header: this.context.translateService.instant('account-transaction-list.migrate-alert.header'),
          message: `Do you want to transfer <span class=\"style__strong color__primary\">${this.context.wallet.currentBalance.shiftedBy(
            -1 * this.context.wallet.coinProtocol.decimals
          )} XTZ</span> </strong> from <span class=\"style__strong color__primary\"> ${shortenString.transform(
            this.context.wallet.receivingPublicAddress
          )} </span> to <span class=\"style__strong color__primary\"> ${shortenString.transform(
            this.context.mainWallet.addresses[0]
          )}</span>?`,
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
                  address: this.context.mainWallet.addresses[0],
                  forceMigration: true
                }
                this.context.dataService.setData(DataServiceKey.DETAIL, info)
                this.context.router
                  .navigateByUrl('/transaction-prepare/' + DataServiceKey.DETAIL)
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
