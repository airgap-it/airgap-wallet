import {
  PolkadotDelegateActionResult,
  PolkadotDelegateAction,
  PolkadotDelegateActionContext
} from 'airgap-coin-lib/dist/actions/PolkadotDelegateAction'
import { ToastController, LoadingController } from '@ionic/angular'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { Router } from '@angular/router'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { Action } from 'airgap-coin-lib/dist/actions/Action'

export interface AirGapPolkadotDelegateActionContext extends PolkadotDelegateActionContext {
  toastController: ToastController
  loadingController: LoadingController
  dataService: DataService
  router: Router
}

export class AirGapPolkadotDelegateAction extends Action<PolkadotDelegateActionResult, AirGapPolkadotDelegateActionContext> {
  private loader: HTMLIonLoadingElement | undefined
  private readonly delegateAction: PolkadotDelegateAction<AirGapPolkadotDelegateActionContext>

  public constructor(context: AirGapPolkadotDelegateActionContext) {
    super(context)
    this.delegateAction = new PolkadotDelegateAction(context)
    this.setupOnComplete(context)
    this.setupOnError(context)
  }

  protected async perform(): Promise<PolkadotDelegateActionResult> {
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

  private setupOnComplete(context: AirGapPolkadotDelegateActionContext) {
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

  private setupOnError(context: AirGapPolkadotDelegateActionContext) {
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
