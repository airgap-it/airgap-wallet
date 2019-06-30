import { Router } from '@angular/router'
import { LoadingController, ToastController } from '@ionic/angular'
import { DelegateAction, DelegateActionContext, DelegateActionResult } from 'airgap-coin-lib/dist/actions/DelegateAction'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { WalletActionInfo } from '../ActionGroup'

export interface DelegateActionEnvironment {
  toastController: ToastController
  loadingController: LoadingController
  dataService: DataService
  router: Router
}

export class AirGapDelegateAction extends DelegateAction<DelegateActionEnvironment> {
  public readonly info: WalletActionInfo = {
    name: 'account-transaction-list.delegate_label',
    icon: 'logo-usd'
  }

  protected data: {
    loader: HTMLIonLoadingElement | undefined
  }

  public readonly beforeHandler = async (): Promise<void> => {
    const loader: HTMLIonLoadingElement = await this.context.env.loadingController.create({
      message: 'Preparing transaction...'
    })

    await loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
    this.data.loader = loader
  }

  public readonly afterHandler = async (): Promise<void> => {
    if (this.data.loader) {
      this.data.loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
    }
  }

  public readonly completeFunction = async (
    context: DelegateActionContext<DelegateActionEnvironment>,
    result: DelegateActionResult
  ): Promise<void> => {
    context.env.dataService.setData(DataServiceKey.INTERACTION, {
      wallet: context.wallet,
      airGapTx: result.airGapTx,
      data: result.dataUrl
    })
    context.env.router
      .navigateByUrl(`/interaction-selection/${DataServiceKey.INTERACTION}`)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public readonly errorFunction = async (context: DelegateActionContext<DelegateActionEnvironment>, error: Error): Promise<void> => {
    handleErrorSentry(ErrorCategory.OTHER)(`${this.identifier}-${error}`)

    const toast: HTMLIonToastElement = await context.env.toastController.create({
      message: error.message,
      duration: 3000,
      position: 'bottom'
    })
    toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
  }
}
