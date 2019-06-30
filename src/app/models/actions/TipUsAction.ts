import { Router } from '@angular/router'
import { ToastController } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { Action, ActionProgress } from '../Action'
import { WalletActionInfo } from '../ActionGroup'

export interface TipUsActionContext<T> {
  wallet: AirGapMarketWallet
  tipAddress: string
  env: T
}

export interface TipUsActionEnvironment {
  toastController: ToastController
  dataService: DataService
  router: Router
}

export class AirGapTipUsAction extends Action<TipUsActionContext<TipUsActionEnvironment>, ActionProgress<void>, void> {
  public readonly identifier: string = 'tip-us-action'
  public readonly info: WalletActionInfo = {
    name: 'Tip Us',
    icon: 'logo-usd'
  }

  public readonly handlerFunction = async (): Promise<void> => {
    console.log('TODO')
  }

  public readonly completeFunction = async (context: TipUsActionContext<TipUsActionEnvironment>, result: void): Promise<void> => {
    context.env.dataService.setData(DataServiceKey.INTERACTION, {
      wallet: context.wallet
    })
    context.env.router
      .navigateByUrl(`/interaction-selection/${DataServiceKey.INTERACTION}`)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public readonly errorFunction = async (context: TipUsActionContext<TipUsActionEnvironment>, error: Error): Promise<void> => {
    handleErrorSentry(ErrorCategory.OTHER)(`${this.identifier}-${error}`)

    const toast: HTMLIonToastElement = await context.env.toastController.create({
      message: error.message,
      duration: 3000,
      position: 'bottom'
    })
    toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
  }
}
