import { Injectable } from '@angular/core'
import { BaseRequest } from '@airgap/beacon-sdk/dist/client/Messages'
import { WalletClient } from '@airgap/beacon-sdk/dist/client/clients/WalletClient'
import { ModalController } from '@ionic/angular'
import { BeaconRequestPage } from 'src/app/pages/beacon-request/beacon-request.page'

@Injectable({
  providedIn: 'root'
})
export class BeaconService {
  private client: WalletClient | undefined
  constructor(private readonly modalController: ModalController) {
    this.init()
  }

  public async init(): Promise<boolean> {
    this.client = new WalletClient('AirGapWallet')
    await this.client.init()

    return this.client.connect(message => {
      console.log('WALLET gotEncryptedMessage:', message)

      console.log('typeof', typeof message)

      this.presentModal(message, { pubKey: 'not available yet' })
    })
  }

  public async addPeer(pubKey: string, relayServer: string) {
    this.client.addPeer({ pubKey, relayServer } as any)
  }

  async presentModal(request: BaseRequest, dappInfo: { pubKey: string }) {
    console.log('presentModal')
    const modal = await this.modalController.create({
      component: BeaconRequestPage,
      componentProps: {
        request,
        dappInfo,
        client: this.client
      }
    })
    return await modal.present()
  }

  public async respond(requestId: string, message: string) {
    if (!this.client) {
      throw new Error('Client not ready')
    }
    this.client.respond(requestId, message)
  }

  public async getPeers(): Promise<string[]> {
    return this.client.getPeers()
  }

  public async removePeer(id: string): Promise<void> {
    await this.client.removePeer(id)
  }

  public async removeAllPeers(): Promise<void> {
    await this.client.removeAllPeers()
  }
}
