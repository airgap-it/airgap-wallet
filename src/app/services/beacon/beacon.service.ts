import {
  BEACON_VERSION,
  BeaconErrorType,
  BeaconMessageType,
  BeaconRequestOutputMessage,
  BeaconResponseInputMessage,
  BroadcastResponseInput,
  Network,
  NetworkType,
  OperationResponseInput,
  P2PPairInfo,
  SignPayloadResponseInput,
  WalletClient
} from '@airgap/beacon-sdk'
import { Injectable } from '@angular/core'
import { LoadingController, ModalController } from '@ionic/angular'
import { BeaconRequestPage } from 'src/app/pages/beacon-request/beacon-request.page'
import { ErrorPage } from 'src/app/pages/error/error.page'

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

      if (!(await this.isNetworkSupported((message as { network?: Network }).network))) {
        const responseType: BeaconMessageType =
          message.type === BeaconMessageType.PermissionRequest
            ? BeaconMessageType.PermissionResponse
            : message.type === BeaconMessageType.OperationRequest
            ? BeaconMessageType.OperationResponse
            : message.type === BeaconMessageType.BroadcastRequest
            ? BeaconMessageType.BroadcastResponse
            : BeaconMessageType.BroadcastResponse
        // TODO: Add function to sdk that gets corresponding response type for request type

        return this.sendNetworkNotSupportedError(message.id, responseType)
      } else {
        await this.presentModal(message)
      }
    })
  }

  async presentModal(request: BeaconRequestOutputMessage) {
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

  public async addVaultRequest(messageId: string, requestPayload: any): Promise<void> {
    this.requests.push([messageId, requestPayload])
  }

  public async getVaultRequest(signedMessage: string, hash: string): Promise<void> {
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

  private async isNetworkSupported(network?: Network): Promise<boolean> {
    if (!network) {
      return true
    }

    return network.type === NetworkType.MAINNET
  }

  private async displayErrorPage(error: Error & { data?: unknown }): Promise<void> {
    const modal = await this.modalController.create({
      component: ErrorPage,
      componentProps: {
        title: error.name,
        message: error.message,
        data: error.data ? error.data : error.stack
      }
    })

    return modal.present()
  }

  private async sendNetworkNotSupportedError(id: string, type: BeaconMessageType): Promise<void> {
    const responseInput = {
      id,
      type,
      errorType: BeaconErrorType.NETWORK_NOT_SUPPORTED
    } as any

    const response: BeaconResponseInputMessage = {
      beaconId: await this.client.beaconId,
      version: BEACON_VERSION,
      ...responseInput
    }
    await this.respond(response)
    await this.displayErrorPage(new Error('Network not supported!'))
  }
}
