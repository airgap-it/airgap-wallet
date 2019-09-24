import { Router } from '@angular/router'
import { LoadingController, ToastController } from '@ionic/angular'
import { Action } from 'airgap-coin-lib/dist/actions/Action'
import { TezosDelegateAction, TezosDelegateActionContext, TezosDelegateActionResult } from 'airgap-coin-lib/dist/actions/DelegateAction'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

export interface AirGapDelegateActionContext extends TezosDelegateActionContext {
  toastController: ToastController
  loadingController: LoadingController
  dataService: DataService
  router: Router
}

export class AirGapDelegateAction extends Action<TezosDelegateActionResult, AirGapDelegateActionContext> {
  private loader: HTMLIonLoadingElement | undefined
  private readonly delegateAction: TezosDelegateAction<AirGapDelegateActionContext>

  public constructor(context: AirGapDelegateActionContext) {
    super(context)
    this.delegateAction = new TezosDelegateAction(context)
    this.setupOnComplete(context)
    this.setupOnError(context)
  }

  protected async perform(): Promise<TezosDelegateActionResult> {
    this.loader = await this.delegateAction.context.loadingController.create({
      message: 'Preparing transaction...'
    })

    await this.loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))

    try {
      await this.delegateAction.start()
    } catch (error) {
      await this.onError(error)
    }

    return this.delegateAction.result
  }

  private setupOnComplete(context: AirGapDelegateActionContext) {
    this.delegateAction.onComplete = async result => {
      this.dismissLoader()

      context.dataService.setData(DataServiceKey.INTERACTION, {
        wallet: context.wallet,
        airGapTxs: result.airGapTxs,
        data: result.dataUrl
      })
      context.router
        .navigateByUrl(`/interaction-selection/${DataServiceKey.INTERACTION}`)
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private setupOnError(context: AirGapDelegateActionContext) {
    this.onError = async error => {
      this.dismissLoader()
      handleErrorSentry(ErrorCategory.OTHER)(`${this.identifier}-${error}`)

      const toast: HTMLIonToastElement = await context.toastController.create({
        message: error.message,
        duration: 3000,
        position: 'bottom'
      })
      toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
    }
  }

  private dismissLoader() {
    if (this.loader) {
      this.loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
    }
  }
}
