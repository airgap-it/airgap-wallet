import { Injectable } from '@angular/core'
import { ModalController } from '@ionic/angular'
import WalletConnect from '@walletconnect/client'
import BigNumber from 'bignumber.js'

import { WalletconnectPage } from '../../pages/walletconnect/walletconnect.page'

export function getCachedSession(): any {
  const local = localStorage ? localStorage.getItem('walletconnect') : null

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

@Injectable({
  providedIn: 'root'
})
export class WalletconnectService {
  private connector: WalletConnect | undefined

  constructor(private readonly modalController: ModalController) {
    try {
      const session = getCachedSession()
      if (session) {
        console.log('SESSION FOUND', session)
        this.connector = new WalletConnect({ session })
        this.subscribeToEvents()
      }
    } catch (e) {}
  }

  public async connect(uri: string): Promise<void> {
    console.log('connecting to uri', uri)
    if (this.connector) {
      return
    }
    this.connector = new WalletConnect(
      {
        uri,
        clientMeta: {
          description: 'AirGapped Transactions',
          url: 'https://airgap.it',
          icons: ['https://airgap.it/wp-content/uploads/2018/05/Airgap_Logo_sideways_color.png'],
          name: 'AirGap'
        }
      }
      // {
      //   // Optional
      //   url: 'https://push.walletconnect.org',
      //   type: 'fcm',
      //   token: token,
      //   peerMeta: true,
      //   language: language
      // }
    )

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

      // Handle Session Request

      /* payload:
			{
				id: 1,
				jsonrpc: '2.0'.
				method: 'session_request',
				params: [{
					peerId: '15d8b6a3-15bd-493e-9358-111e3a4e6ee4',
					peerMeta: {
						name: "WalletConnect Example",
						description: "Try out WalletConnect v1.x.x",
						icons: ["https://example.walletconnect.org/favicon.ico"],
						url: "https://example.walletconnect.org"
					}
				}]
			}
			*/
    })

    // Subscribe to call requests
    this.connector.on('call_request', (error, payload) => {
      if (error) {
        throw error
      }

      this.presentModal(payload)

      // Handle Call Request

      /* payload:
			{
				id: 1,
				jsonrpc: '2.0'.
				method: 'eth_sign',
				params: [
					"0xbc28ea04101f03ea7a94c1379bc3ab32e65e62d3",
					"My email is john@doe.com - 1537836206101"
				]
			}
			*/
    })

    this.connector.on('disconnect', (error, payload) => {
      if (error) {
        throw error
      }

      console.log('WALLETCONNECT - DISCONNECT', payload)

      // Delete connector
    })
  }

  public async approveRequest(id: string, result: string) {
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
}
