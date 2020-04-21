import {
  BeaconBaseMessage,
  BeaconMessageType,
  BroadcastResponse,
  OperationResponse,
  SignPayloadResponse,
  WalletClient
} from '@airgap/beacon-sdk'
import { P2PPairInfo } from '@airgap/beacon-sdk/dist/types/P2PPairInfo'
import { Injectable } from '@angular/core'
import { ModalController } from '@ionic/angular'
import { BeaconRequestPage } from 'src/app/pages/beacon-request/beacon-request.page'

@Injectable({
  providedIn: 'root'
})
export class BeaconService {
  private client: WalletClient | undefined
  private messages: BeaconBaseMessage[] = []
  private requests: [string, any][] = []

  constructor(private readonly modalController: ModalController) {
    this.init()
  }

  public async init(): Promise<boolean> {
    this.client = new WalletClient('AirGapWallet')
    await this.client.init()

    return this.client.connect(message => {
      console.log('WALLET gotEncryptedMessage:', message)

      console.log('typeof', typeof message)

      this.messages.push(message)

      this.presentModal(message, { pubKey: 'not available yet' })
    })
  }

  public async addPeer(pubKey: string, relayServer: string, name: string) {
    this.client.addPeer({ pubKey, relayServer, name } as any)
  }

  async presentModal(request: BeaconBaseMessage, dappInfo: { pubKey: string }) {
    console.log('presentModal')
    const modal = await this.modalController.create({
      component: BeaconRequestPage,
      componentProps: {
        request,
        dappInfo,
        client: this.client,
        beaconService: this
      }
    })
    return await modal.present()
  }

  public async addVaultRequest(messageId, unsignedTransaction) {
    this.requests.push([messageId, unsignedTransaction])
  }

  public async getVaultRequest(signedMessage: string, hash: string) {
    // TODO: Refactor this once we have IDs in the serializer between Wallet <=> Vault
    this.requests = this.requests.filter(request => {
      if (signedMessage === request[1]) {
        const broadcastResponse: BroadcastResponse = {
          id: request[0],
          type: BeaconMessageType.BroadcastResponse,
          beaconId: '',
          transactionHash: hash
        }
        this.respond(broadcastResponse)

        return false
      } else if (signedMessage.startsWith(request[1])) {
        const signPayloadResponse: SignPayloadResponse = {
          id: request[0],
          type: BeaconMessageType.SignPayloadResponse,
          beaconId: '',
          signature: signedMessage.substr(signedMessage.length - 128)
        }
        this.respond(signPayloadResponse)

        return false
      } else if (signedMessage.startsWith(request[1].binaryTransaction)) {
        const operationResponse: OperationResponse = {
          id: request[0],
          type: BeaconMessageType.OperationResponse,
          beaconId: '',
          transactionHash: hash
        }
        this.respond(operationResponse)

        return false
      } else {
        console.log('NO MATCH', signedMessage, request[1].binaryTransaction)

        return true
      }
    })
  }

  public async respond(message: BeaconBaseMessage) {
    if (!this.client) {
      throw new Error('Client not ready')
    }
    console.log('responding', message)
    this.client.respond(message)
  }

  public async getPeers(): Promise<P2PPairInfo[]> {
    return this.client.getPeers()
  }

  public async removePeer(peer: P2PPairInfo): Promise<void> {
    await this.client.removePeer(peer)
  }

  public async removeAllPeers(): Promise<void> {
    await this.client.removeAllPeers()
  }
}
