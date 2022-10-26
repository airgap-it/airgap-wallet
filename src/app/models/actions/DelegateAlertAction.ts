import { UiEventService } from '@airgap/angular-core'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { Action } from '@airgap/coinlib-core/actions/Action'
import { AlertController, LoadingController, PopoverController, ToastController } from '@ionic/angular'
import { DataService } from 'src/app/services/data/data.service'
import { OperationsProvider } from 'src/app/services/operations/operations'

import { WalletActionInfo } from '../ActionGroup'

import { AirGapDelegatorAction } from './DelegatorAction'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { TezosDelegatorAction } from '@airgap/tezos'

export interface DelegateAlertActionContext {
  isAccepted?: boolean
  wallet: AirGapMarketWallet
  delegate: string
  toastController: ToastController
  loadingController: LoadingController
  operationsProvider: OperationsProvider
  dataService: DataService
  accountService: AccountProvider
  popoverController: PopoverController
  uiEventService: UiEventService
  alertController: AlertController
  alertTitle: string
  alertDescription: string
}

export class DelegateAlertAction extends Action<void, DelegateAlertActionContext> {
  public get identifier(): string {
    return 'tip-us-action'
  }
  public readonly info: WalletActionInfo = {
    name: 'Tip Us',
    icon: 'logo-usd'
  }
  private readonly delegateAction: AirGapDelegatorAction

  constructor(context: DelegateAlertActionContext) {
    super(context)
    this.delegateAction = new AirGapDelegatorAction({
      type: TezosDelegatorAction.DELEGATE,
      data: {
        delegate: context.delegate
      },
      ...context
    })
  }

  protected async perform(): Promise<void> {
    await this.showAlert()
    if (this.context.isAccepted) {
      await this.delegateAction.start()
    } else {
      // Do nothing
    }
  }

  private async showAlert(): Promise<void> {
    return new Promise<void>(async (resolve) => {
      await this.context.uiEventService.showTranslatedAlert({
        header: this.context.alertTitle ? this.context.alertTitle : 'action-alert-delegation.heading',
        message: this.context.alertDescription ? this.context.alertDescription : 'action-alert-delegation.text',
        buttons: [
          {
            text: 'action-alert-delegation.cancel_label',
            role: 'cancel',
            cssClass: 'secondary',
            handler: (): void => {
              this.context.isAccepted = false
              resolve()
            }
          },
          {
            text: 'action-alert-delegation.ok_label',
            handler: (): void => {
              this.context.isAccepted = true
              resolve()
            }
          }
        ]
      })
    })
  }
}
