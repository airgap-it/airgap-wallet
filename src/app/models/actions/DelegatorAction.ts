import { ToastController, LoadingController } from '@ionic/angular'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { Router } from '@angular/router'
import { AirGapMarketWallet } from '@airgap/coinlib-core'

import { Action } from '@airgap/coinlib-core/actions/Action'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { OperationsProvider } from 'src/app/services/operations/operations'

export interface AirGapDelegatorActionContext {
  wallet: AirGapMarketWallet
  type: any
  data?: any
  toastController: ToastController
  loadingController: LoadingController
  operationsProvider: OperationsProvider
  dataService: DataService
  router: Router
}

export class AirGapDelegatorAction extends Action<void, AirGapDelegatorActionContext> {
  private loader: HTMLIonLoadingElement | undefined

  public constructor(readonly context: AirGapDelegatorActionContext) {
    super(context)
  }

  protected async perform(): Promise<void> {
    this.loader = await this.context.loadingController.create({
      message: 'Preparing transaction...'
    })

    await this.loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))

    try {
      const { airGapTxs, unsignedTx } = await this.context.operationsProvider.prepareDelegatorAction(
        this.context.wallet,
        this.context.type,
        this.context.data
      )

      const info = {
        wallet: this.context.wallet,
        airGapTxs,
        data: unsignedTx
      }

      this.context.dataService.setData(DataServiceKey.INTERACTION, info)
      this.context.router
        .navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION, { skipLocationChange: true })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      handleErrorSentry(ErrorCategory.OTHER)(`${this.identifier}-${error}`)

      const toast: HTMLIonToastElement = await this.context.toastController.create({
        message: error.message,
        duration: 3000,
        position: 'bottom'
      })
      toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
    } finally {
      this.dismissLoader()
    }
  }

  private dismissLoader() {
    if (this.loader) {
      this.loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
    }
  }
}
