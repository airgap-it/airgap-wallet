import { assertNever } from '@airgap/angular-core'
import { Component, OnInit } from '@angular/core'
import { ModalController } from '@ionic/angular'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { WalletconnectV1Handler, WalletconnectV1HandlerContext } from './handler/walletconnect-v1.handler'
import { WalletconnectV2Handler, WalletconnectV2HandlerContext } from './handler/walletconnect-v2.handler'
import { WalletconnectHandler } from './handler/walletconnect.handler'

export interface WalletconnectV1Context extends WalletconnectV1HandlerContext {
  version: 1
}

export interface WalletconnectV2Context extends WalletconnectV2HandlerContext {
  version: 2
}

export type WalletconnectContext = WalletconnectV1Context | WalletconnectV2Context

@Component({
  selector: 'app-dapp-confirm',
  templateUrl: './dapp-confirm.page.html',
  styleUrls: ['./dapp-confirm.page.scss']
})
export class DappConfirmPage implements OnInit {
  public context: WalletconnectContext
  public result: string

  private readonly handlers = {
    v1: new WalletconnectV1Handler(),
    v2: new WalletconnectV2Handler()
  }

  public constructor(private readonly modalController: ModalController) {}

  public async ngOnInit(): Promise<void> {
    this.result = await this.getHandler().readResult(this.context)
  }

  public async approveRequest() {
    await this.getHandler().approveRequest(this.context)
    this.dismissModal()
  }

  public async rejectRequest() {
    await this.getHandler().rejectRequest(this.context)
    this.dismissModal()
  }

  public async dismissModal(): Promise<void> {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private getHandler(): WalletconnectHandler<any> {
    switch (this.context.version) {
      case 1:
        return this.handlers['v1']
      case 2:
        return this.handlers['v2']
      default:
        assertNever('context', this.context)
    }
  }
}
