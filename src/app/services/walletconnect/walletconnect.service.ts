import { Injectable } from '@angular/core'
import { ModalController } from '@ionic/angular'
import WalletConnect from '@walletconnect/client'
import BigNumber from 'bignumber.js'
import { WalletconnectPage } from '../../pages/walletconnect/walletconnect.page'

export async function getCachedSession(): Promise<any> {
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

export interface WalletConnectRequestApproval {
  id: number
  result: string
}

@Injectable({
  providedIn: 'root'
})
export class WalletconnectService {
  private connector: WalletConnect | undefined

  constructor(private readonly modalController: ModalController) {
    try {
      getCachedSession().then(session => {
        if (session) {
          console.log('SESSION FOUND', session)
          this.connector = new WalletConnect({ session })
          this.subscribeToEvents()
        }
      })
    } catch (e) {}
  }

  public async connect(uri: string): Promise<void> {
    console.log('connecting to uri', uri)
    if (this.connector) {
      return
    }
    this.connector = new WalletConnect({
      uri,
      clientMeta: {
        description: 'AirGapped Transactions',
        url: 'https://airgap.it',
        icons: ['https://airgap.it/wp-content/uploads/2018/05/Airgap_Logo_sideways_color.png'],
        name: 'AirGap'
      }
    })

    await this.subscribeToEvents()
  }

  public async subscribeToEvents(): Promise<void> {
    console.log('subscribing to walletconnect events')
    if (!this.connector) {
      console.log('walletconnect object not ready')

      return
    }

    this.connector.on('session_request', (error, payload) => {
      if (error) {
        throw error
      }
      console.log('session_request', payload)
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
    console.log('approveRequest', id, result)
    this.connector.approveRequest({
      id: new BigNumber(id).toNumber(),
      result: result
    })
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

  public async getPermission() {
    return getCachedSession()
  }

  public async removePermission(): Promise<void> {
    return new Promise(resolve => {
      if (this.connector) {
        this.connector.killSession()
        this.connector.on('disconnect', error => {
          if (error) {
            throw error
          }
          resolve()
        })
      }
    })
  }
}
