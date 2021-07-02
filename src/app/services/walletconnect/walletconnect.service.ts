import { Injectable } from '@angular/core'
import { LoadingController, ModalController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import WalletConnect from '@walletconnect/client'
import { DappConfirmPage } from 'src/app/pages/dapp-confirm/dapp-confirm.page'
import { WalletconnectPage } from '../../pages/walletconnect/walletconnect.page'

export async function getCachedSession(): Promise<WalletconnectSession> {
  const local = localStorage ? await localStorage.getItem('walletconnect') : null

  let session = null
  if (local) {
    try {
      session = JSON.parse(local)
    } catch (error) {
      throw error
    }
  }

  return session
}

export interface ClientMeta {
  description: string
  url: string
  icons: string[]
  name: string
}

export interface PeerMeta {
  description: string
  url: string
  icons: string[]
  name: string
}

export interface WalletconnectSession {
  connected: boolean
  accounts: string[]
  chainId: number
  bridge: string
  key: string
  clientId: string
  clientMeta: ClientMeta
  peerId: string
  peerMeta: PeerMeta
  handshakeId: number
  handshakeTopic: string
}

export interface WalletConnectRequestApproval {
  id: number
  result: string
}

@Injectable({
  providedIn: 'root'
})
export class WalletconnectService {
  private connector: WalletConnect | undefined
  private loading: HTMLIonLoadingElement

  constructor(
    private readonly modalController: ModalController,
    private readonly loadingController: LoadingController,
    private readonly translateService: TranslateService
  ) {
    try {
      getCachedSession().then((session) => {
        if (session) {
          this.connector = new WalletConnect({ session })
          this.subscribeToEvents()
        }
      })
    } catch (e) {}
  }

  public async connect(uri: string): Promise<void> {
    this.connector = new WalletConnect({
      uri,
      clientMeta: {
        description: 'AirGapped Transactions',
        url: 'https://airgap.it',
        icons: ['https://airgap.it/wp-content/uploads/2018/05/Airgap_Logo_sideways_color.png'],
        name: 'AirGap'
      }
    })

    if (!this.connector.connected) {
      await this.connector.createSession()
    }

    this.presentLoading()

    await this.subscribeToEvents()
  }

  async presentLoading() {
    this.loading = await this.loadingController.create({
      message: this.translateService.instant('dapps.wait_for_walletconnect'),
      backdropDismiss: true
    })
    await this.loading.present()
  }

  public async subscribeToEvents(): Promise<void> {
    if (!this.connector) {
      return
    }

    this.connector.on('session_request', (error, payload) => {
      if (error) {
        throw error
      }
      this.loading.dismiss()
      this.presentModal(payload)
    })

    // Subscribe to call requests
    this.connector.on('call_request', (error, payload) => {
      if (error) {
        throw error
      }

      this.presentModal(payload)
    })
  }

  public async approveRequest(id: string, result: string) {
    // console.log('APPROVE REQUEST', id, result)
    this.presentConfirmationModal(id, result)
  }

  async presentConfirmationModal(id: string, result: string) {
    const modal = await this.modalController.create({
      component: DappConfirmPage,
      componentProps: {
        connector: this.connector,
        id: id,
        result: result
      }
    })

    return modal.present()
  }

  async presentModal(request: any) {
    const modal = await this.modalController.create({
      component: WalletconnectPage,
      componentProps: {
        request,
        connector: this.connector,
        walletConnectService: this
      }
    })

    return modal.present()
  }

  public async getPermission(): Promise<WalletconnectSession> {
    return getCachedSession()
  }

  public async removePermission(): Promise<void> {
    return new Promise((resolve) => {
      if (this.connector) {
        this.connector.killSession()
        this.connector.on('disconnect', (error) => {
          if (error) {
            throw error
          }
          resolve()
        })
      }
    })
  }
}
