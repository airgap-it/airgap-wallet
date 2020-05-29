import {
  BeaconMessageType,
  BeaconRequestOutputMessage,
  BeaconResponseInputMessage,
  BroadcastResponseInput,
  OperationResponseInput,
  P2PPairInfo,
  SignPayloadResponseInput,
  WalletClient
} from '@airgap/beacon-sdk'
import { Injectable } from '@angular/core'
import { LoadingController, ModalController } from '@ionic/angular'
import { BeaconRequestPage } from 'src/app/pages/beacon-request/beacon-request.page'

import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

@Injectable({
  providedIn: 'root'
})
export class BeaconService {
  public client: WalletClient | undefined
  private requests: [string, any][] = []

  constructor(private readonly modalController: ModalController, private readonly loadingController: LoadingController) {
    this.init()
  }

  public async init(): Promise<boolean> {
    this.client = new WalletClient({ name: 'AirGapWallet' })
    await this.client.init()

    return this.client.connect(async message => {
      console.log('WALLET gotEncryptedMessage:', message)

      console.log('typeof', typeof message)

      await this.presentModal(message)
    })
  }

  async presentModal(request: BeaconRequestOutputMessage) {
    console.log('presentModal')
    const modal = await this.modalController.create({
      component: BeaconRequestPage,
      componentProps: {
        request,
        client: this.client,
        beaconService: this
      }
    })

    return modal.present()
  }

  public async addVaultRequest(messageId: string, requestPayload: any) {
    this.requests.push([messageId, requestPayload])
  }

  public async getVaultRequest(signedMessage: string, hash: string) {
    // TODO: Refactor this once we have IDs in the serializer between Wallet <=> Vault
    this.requests = this.requests.filter(request => {
      if (signedMessage === request[1]) {
        const broadcastResponse: BroadcastResponseInput = {
          id: request[0],
          type: BeaconMessageType.BroadcastResponse,
          transactionHash: hash
        }
        this.respond(broadcastResponse).catch(handleErrorSentry(ErrorCategory.BEACON))

        return false
      } else if (signedMessage.startsWith(request[1])) {
        const signPayloadResponse: SignPayloadResponseInput = {
          id: request[0],
          type: BeaconMessageType.SignPayloadResponse,
          signature: signedMessage.substr(signedMessage.length - 128)
        }
        this.respond(signPayloadResponse).catch(handleErrorSentry(ErrorCategory.BEACON))

        return false
      } else if (signedMessage.startsWith(request[1].binaryTransaction)) {
        const operationResponse: OperationResponseInput = {
          id: request[0],
          type: BeaconMessageType.OperationResponse,
          transactionHash: hash
        }
        this.respond(operationResponse).catch(handleErrorSentry(ErrorCategory.BEACON))

        return false
      } else {
        console.log('NO MATCH', signedMessage, request[1].binaryTransaction)

        return true
      }
    })
  }

  public async respond(message: BeaconResponseInputMessage): Promise<void> {
    if (!this.client) {
      throw new Error('Client not ready')
    }
    console.log('responding', message)
    await this.client.respond(message)
  }

  public async addPeer(peer: P2PPairInfo): Promise<void> {
    const loading: HTMLIonLoadingElement = await this.loadingController.create({
      message: 'Connecting to Beacon Network...',
      duration: 3000
    })
    await loading.present()
    await this.client.addPeer(peer)
    await loading.dismiss()
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
