import { Component } from '@angular/core'
import { ModalController } from '@ionic/angular'
import WalletConnect from '@walletconnect/client'
import BigNumber from 'bignumber.js'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'app-dapp-confirm',
  templateUrl: './dapp-confirm.page.html',
  styleUrls: ['./dapp-confirm.page.scss']
})
export class DappConfirmPage {
  private readonly connector: WalletConnect | undefined
  public id: string | undefined
  public result: string | undefined

  constructor(private readonly modalController: ModalController) {}

  public async approveRequest() {
    this.connector.approveRequest({
      id: new BigNumber(this.id).toNumber(),
      result: this.result
    })
    this.dismissModal()
  }

  public async rejectRequest() {
    this.connector.rejectRequest({
      id: new BigNumber(this.id).toNumber(),
      error: {
        message: 'USER_REJECTION' // optional
      }
    })
    this.dismissModal()
  }

  public async dismissModal(): Promise<void> {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
