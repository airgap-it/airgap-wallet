import { Injectable } from '@angular/core'
import { LoadingController, ModalController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import WalletConnect from '@walletconnect/client'
import { DappConfirmPage } from 'src/app/pages/dapp-confirm/dapp-confirm.page'
import { WalletconnectPage } from '../../pages/walletconnect/walletconnect.page'
import { getAllValidWalletConnectSessions, clientMeta } from './helpers'
import { mapValues, isEmpty } from 'lodash'
import { ErrorPage } from 'src/app/pages/error/error.page'
import { UiEventService } from '@airgap/angular-core'
@Injectable({
  providedIn: 'root'
})
export class WalletconnectService {
  private activeConnector: WalletConnect | undefined
  private loading: HTMLIonLoadingElement

  private timeout: NodeJS.Timeout | undefined

  constructor(
    private readonly modalController: ModalController,
    private readonly loadingController: LoadingController,
    private readonly translateService: TranslateService,
    private readonly uiEventService: UiEventService
  ) {}

  public async initWalletConnect(): Promise<void> {
    const allSessions = await getAllValidWalletConnectSessions()
    if (isEmpty(allSessions)) {
      return
    }
    mapValues(allSessions, (session) => {
      const walletConnector = new WalletConnect({ clientMeta, session })
      this.subscribeToEvents(walletConnector)
    })
  }

  public async connect(uri: string): Promise<void> {
    let connector = new WalletConnect({
      uri,
      clientMeta
    })

    if (!connector.connected) {
      await connector.createSession()
    }

    this.subscribeToEvents(connector)

    this.presentLoading()

    this.timeout = setTimeout(() => {
      this.showTimeoutAlert()
    }, 1008)
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      message: this.translateService.instant('walletconnect.wait'),
      backdropDismiss: true
    })
    await this.loading.present()
  }
  public async subscribeToEvents(connector: WalletConnect): Promise<void> {
    if (!connector) {
      return
    }

    connector.on('session_request', async (error, payload) => {
      clearTimeout(this.timeout)

      this.loading.dismiss()

      if (error) {
        const modal = await this.modalController.create({
          component: ErrorPage,
          componentProps: {
            title: error.message ?? 'Error',
            message: this.translateService.instant('walletconnect.error'),
            data: undefined
          }
        })
        return modal.present()
      }

      this.presentModal(payload, connector)
    })

    connector.on('call_request', (error, payload) => {
      if (error) {
        throw error
      }
      this.activeConnector = connector
      this.presentModal(payload, connector)
    })
  }

  private async showTimeoutAlert() {
    this.loading?.dismiss()

    await this.uiEventService.showTranslatedAlert({
      header: 'walletconnect.timeout.title',
      message: 'walletconnect.timeout.message',
      buttons: [
        {
          text: 'ok',
          role: 'cancel',
          cssClass: 'secondary'
        }
      ],
      backdropDismiss: false
    })
  }

  public async approveRequest(id: string, result: string) {
    this.presentConfirmationModal(id, result)
  }

  async presentConfirmationModal(id: string, result: string) {
    const modal = await this.modalController.create({
      component: DappConfirmPage,
      componentProps: {
        connector: this.activeConnector,
        id: id,
        result: result
      }
    })

    return modal.present()
  }

  async presentModal(request: any, connector: WalletConnect) {
    const modal = await this.modalController.create({
      component: WalletconnectPage,
      componentProps: {
        request,
        connector: connector,
        walletConnectService: this
      }
    })

    return modal.present()
  }
}
