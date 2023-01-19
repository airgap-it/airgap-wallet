import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { Action } from '@airgap/coinlib-core/actions/Action'
import { IACMessageType } from '@airgap/serializer'
import { LoadingController, ToastController } from '@ionic/angular'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { OperationsProvider } from 'src/app/services/operations/operations'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

export interface AirGapDelegatorActionContext {
  wallet: AirGapMarketWallet
  type: any
  data?: any
  toastController: ToastController
  loadingController: LoadingController
  operationsProvider: OperationsProvider
  dataService: DataService
  accountService: AccountProvider
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
        data: unsignedTx,
        type: IACMessageType.TransactionSignRequest
      }

      this.context.dataService.setData(DataServiceKey.INTERACTION, info)
      this.context.accountService.startInteraction(this.context.wallet, unsignedTx, IACMessageType.TransactionSignRequest, airGapTxs)
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
