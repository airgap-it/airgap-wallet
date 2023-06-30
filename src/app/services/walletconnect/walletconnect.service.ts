import { Injectable } from '@angular/core'
import { LoadingController, ModalController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import WalletConnect from '@walletconnect/client'
import { Core } from '@walletconnect/core'
import { parseUri } from '@walletconnect/utils'
import { Web3Wallet } from '@walletconnect/web3wallet'
import V2Client from '@walletconnect/web3wallet'

import { DappConfirmPage } from 'src/app/pages/dapp-confirm/dapp-confirm.page'
import { mapValues, isEmpty } from 'lodash'
import { ErrorPage } from 'src/app/pages/error/error.page'
import { UiEventService } from '@airgap/angular-core'
import { WalletconnectPage, WalletconnectV1Context, WalletconnectV2Context } from '../../pages/walletconnect/walletconnect.page'
import { getAllValidWalletConnectV1Sessions, clientMeta } from './helpers'

@Injectable({
  providedIn: 'root'
})
export class WalletconnectService {
  private loading: HTMLIonLoadingElement
  private timeout: NodeJS.Timeout | undefined

  private v1Connector: WalletConnect | undefined
  private v2Client: V2Client | undefined

  public constructor(
    private readonly modalController: ModalController,
    private readonly loadingController: LoadingController,
    private readonly translateService: TranslateService,
    private readonly uiEventService: UiEventService
  ) {}

  public async initWalletConnect(): Promise<void> {
    await Promise.all([this.initV1(), this.initV2()])
  }

  private async initV1() {
    const allSessions = await getAllValidWalletConnectV1Sessions()
    if (isEmpty(allSessions)) {
      return
    }
    mapValues(allSessions, (session) => {
      const walletConnector = new WalletConnect({ clientMeta, session })
      this.subscribeToV1Events(walletConnector)
    })
  }

  private async initV2() {
    if (this.v2Client !== undefined) {
      return
    }

    const core = new Core({
      projectId: '24469fd0a06df227b6e5f7dc7de0ff4f' // TODO: replace with a production project ID, preferrably read from the environment
    })

    this.v2Client = await Web3Wallet.init({
      core,
      metadata: {
        name: 'AirGap Wallet',
        description: 'AirGap is a crypto wallet system that lets you secure cypto assets with one secret on an offline device.',
        url: 'https://airgap.it/',
        icons: []
      }
    })

    this.subscribeToV2Events(this.v2Client)
  }

  public async connect(uri: string): Promise<void> {
    const { version } = parseUri(uri)

    switch (version) {
      case 1:
        return this.connectV1(uri)
      case 2:
        return this.connectV2(uri)
      default:
        throw new Error(`WalletConnect v${version} is not supported`)
    }
  }

  private async connectV1(uri: string): Promise<void> {
    let connector = new WalletConnect({
      uri,
      clientMeta
    })

    if (!connector.connected) {
      await connector.createSession()
    }

    this.subscribeToV1Events(connector)

    this.presentLoading()

    this.timeout = setTimeout(() => {
      this.showTimeoutAlert()
    }, 1008)
  }

  private async connectV2(uri: string): Promise<void> {
    await this.initV2()

    await this.presentLoading()
    await this.v2Client.core.pairing.pair({ uri })

    this.timeout = setTimeout(() => {
      this.showTimeoutAlert()
    }, 1008)
  }

  private async presentLoading() {
    this.loading = await this.loadingController.create({
      message: this.translateService.instant('walletconnect.wait'),
      backdropDismiss: true
    })
    await this.loading.present()
  }

  private async subscribeToV1Events(connector: WalletConnect): Promise<void> {
    if (!connector) {
      return
    }

    this.v1Connector = connector

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

      this.presentV1Modal(payload, connector)
    })

    connector.on('call_request', (error, payload) => {
      if (error) {
        throw error
      }

      this.presentV1Modal(payload, connector)
    })
  }

  private async subscribeToV2Events(client: V2Client): Promise<void> {
    client.on('session_proposal', (proposal) => {
      clearTimeout(this.timeout)

      this.loading.dismiss()
      this.presentV2Modal({ type: 'session_proposal', proposal }, client)
    })

    client.on('session_request', async (event) => {
      this.presentV2Modal({ type: 'session_request', request: event }, client)
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
    const [version, requestId, ...rest] = id.split(':')
    // eslint-disable-next-line default-case
    switch (version) {
      case '1':
        return this.presentV1ConfirmationModal(requestId, result, this.v1Connector)
      case '2':
        const topic = rest[0]
        return this.presentV2ConfirmationModal(requestId, topic, result, this.v2Client)
    }
  }

  private async presentV1ConfirmationModal(id: string, result: string, connector: WalletConnect) {
    const modal = await this.modalController.create({
      component: DappConfirmPage,
      componentProps: {
        context: {
          version: 1,
          id: parseInt(id, 10),
          result,
          connector
        }
      }
    })

    return modal.present()
  }

  private async presentV2ConfirmationModal(id: string, topic: string, result: string, client: V2Client) {
    const modal = await this.modalController.create({
      component: DappConfirmPage,
      componentProps: {
        context: {
          version: 2,
          id: parseInt(id, 10),
          topic,
          result,
          client
        }
      }
    })

    return modal.present()
  }

  private async presentV1Modal(request: WalletconnectV1Context['request'], connector: WalletConnect) {
    const modal = await this.modalController.create({
      component: WalletconnectPage,
      componentProps: {
        context: {
          version: 1,
          request,
          connector
        },
        walletConnectService: this
      }
    })

    return modal.present()
  }

  private async presentV2Modal(message: WalletconnectV2Context['message'], client: V2Client) {
    const modal = await this.modalController.create({
      component: WalletconnectPage,
      componentProps: {
        context: {
          version: 2,
          message,
          client
        },
        walletConnectService: this
      }
    })

    return modal.present()
  }
}
