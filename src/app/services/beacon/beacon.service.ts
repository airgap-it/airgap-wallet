import {
  BEACON_VERSION,
  BeaconErrorType,
  BeaconMessageType,
  BeaconRequestOutputMessage,
  BeaconResponseInputMessage,
  Network,
  NetworkType as BeaconNetworkType,
  P2PPairInfo,
  WalletClient
} from '@airgap/beacon-sdk'
import { Injectable } from '@angular/core'
import { LoadingController, ModalController } from '@ionic/angular'
import { ICoinProtocol } from 'airgap-coin-lib'
import { NetworkType } from 'airgap-coin-lib/dist/utils/ProtocolNetwork'
import { BeaconRequestPage } from 'src/app/pages/beacon-request/beacon-request.page'
import { ErrorPage } from 'src/app/pages/error/error.page'

import { BeaconRequest, SerializedBeaconRequest, WalletStorageKey, WalletStorageService } from '../storage/storage'
import {
  TezosProtocolNetwork,
  TezblockBlockExplorer,
  TezosProtocolNetworkExtras,
  TezosProtocolOptions
} from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocolOptions'
import { TezosNetwork, TezosProtocol } from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocol'

@Injectable({
  providedIn: 'root'
})
export class BeaconService {
  public client: WalletClient | undefined
  private requests: BeaconRequest[] = []

  constructor(
    private readonly modalController: ModalController,
    private readonly loadingController: LoadingController,
    private readonly storage: WalletStorageService
  ) {
    this.init()
  }

  public async init(): Promise<boolean> {
    this.requests = await this.getRequestsFromStorage()
    this.client = new WalletClient({ name: 'AirGapWallet' })
    await this.client.init()

    return this.client.connect(async message => {
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

  public async getRequestsFromStorage(): Promise<BeaconRequest[]> {
    const requests: SerializedBeaconRequest[] = await this.storage.get(WalletStorageKey.BEACON_REQUESTS)

    return await Promise.all(
      requests.map(
        async (request: SerializedBeaconRequest): Promise<BeaconRequest> => {
          return [request.messageId, request.payload, await this.getProtocolBasedOnBeaconNetwork(request.network)]
        }
      )
    )
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

  public async addVaultRequest(messageId: string, requestPayload: any, protocol: ICoinProtocol): Promise<void> {
    this.requests.push([messageId, requestPayload, protocol])
    this.persistRequests()
  }

  public async getVaultRequest(
    signedMessage: string
  ): Promise<[((hash: string) => BeaconResponseInputMessage | undefined) | undefined, ICoinProtocol | undefined]> {
    // TODO: Refactor this once we have IDs in the serializer between Wallet <=> Vault
    let createResponse: (hash: string) => BeaconResponseInputMessage | undefined
    let protocol: ICoinProtocol | undefined

    this.requests = this.requests.filter(request => {
      if (signedMessage === request[1]) {
        protocol = request[2]
        createResponse = (hash: string): BeaconResponseInputMessage | undefined => {
          return {
            id: request[0],
            type: BeaconMessageType.BroadcastResponse,
            transactionHash: hash
          }
        }

        return false
      } else if (signedMessage.startsWith(request[1])) {
        protocol = request[2]
        createResponse = (_hash: string): BeaconResponseInputMessage | undefined => {
          return {
            id: request[0],
            type: BeaconMessageType.SignPayloadResponse,
            signature: signedMessage.substr(signedMessage.length - 128)
          }
        }

        return false
      } else if (signedMessage.startsWith(request[1].binaryTransaction)) {
        protocol = request[2]
        createResponse = (hash: string): BeaconResponseInputMessage | undefined => {
          return {
            id: request[0],
            type: BeaconMessageType.OperationResponse,
            transactionHash: hash
          }
        }

        return false
      } else {
        console.log('NO MATCH', signedMessage, request[1].binaryTransaction)

        return true
      }
    })

    this.persistRequests()

    return [createResponse, protocol]
  }

  public async persistRequests(): Promise<void> {
    const requests: SerializedBeaconRequest[] = this.requests.map(request => ({
      messageId: request[0],
      payload: request[1],
      protocolIdentifier: request[2].identifier,
      network: {
        name: request[2].options.network.name,
        type:
          request[2].options.network.type === NetworkType.MAINNET
            ? BeaconNetworkType.MAINNET
            : request[2].options.network.type === NetworkType.TESTNET
            ? BeaconNetworkType.CARTHAGENET
            : BeaconNetworkType.CUSTOM,
        rpcUrl: request[2].options.network.rpcUrl
      }
    }))

    return this.storage.set(WalletStorageKey.BEACON_REQUESTS, requests)
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

  private async isNetworkSupported(_network?: Network): Promise<boolean> {
    return true
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

  public async getProtocolBasedOnBeaconNetwork(network: Network): Promise<TezosProtocol> {
    const configs: { [key in BeaconNetworkType]: TezosProtocolNetwork } = {
      [BeaconNetworkType.MAINNET]: {
        identifier: undefined,
        name: undefined,
        type: undefined,
        rpcUrl: undefined,
        blockExplorer: undefined,
        extras: {
          network: undefined,
          conseilUrl: undefined,
          conseilNetwork: undefined,
          conseilApiKey: undefined
        }
      },
      [BeaconNetworkType.CARTHAGENET]: {
        identifier: undefined,
        name: network.name || 'Carthagenet',
        type: NetworkType.TESTNET,
        rpcUrl: network.rpcUrl || 'https://tezos-carthagenet-node-1.kubernetes.papers.tech',
        blockExplorer: new TezblockBlockExplorer('https://carthagenet.tezblock.io'),
        extras: {
          network: TezosNetwork.CARTHAGENET,
          conseilUrl: 'https://tezos-carthagenet-conseil-1.kubernetes.papers.tech',
          conseilNetwork: TezosNetwork.CARTHAGENET,
          conseilApiKey: 'airgap00391'
        }
      },
      [BeaconNetworkType.CUSTOM]: {
        identifier: undefined,
        name: network.name || 'Custom Network',
        type: NetworkType.CUSTOM,
        rpcUrl: network.rpcUrl || '',
        blockExplorer: new TezblockBlockExplorer(''),
        extras: {
          network: TezosNetwork.MAINNET,
          conseilUrl: '',
          conseilNetwork: TezosNetwork.MAINNET,
          conseilApiKey: ''
        }
      }
    }

    return new TezosProtocol(
      new TezosProtocolOptions(
        new TezosProtocolNetwork(
          configs[network.type].name,
          configs[network.type].type,
          configs[network.type].rpcUrl,
          configs[network.type].blockExplorer,
          new TezosProtocolNetworkExtras(
            configs[network.type].extras.network,
            configs[network.type].extras.conseilUrl,
            configs[network.type].extras.conseilNetwork,
            configs[network.type].extras.conseilApiKey
          )
        )
      )
    )
  }
}
