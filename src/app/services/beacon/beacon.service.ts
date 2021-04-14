import {
  BEACON_VERSION,
  BeaconErrorType,
  BeaconMessageType,
  BeaconRequestOutputMessage,
  BeaconResponseInputMessage,
  getSenderId,
  Network,
  NetworkType as BeaconNetworkType,
  P2PPairingRequest,
  WalletClient
} from '@airgap/beacon-sdk'

import { Injectable } from '@angular/core'
import { LoadingController, ModalController } from '@ionic/angular'
import { ICoinProtocol, MainProtocolSymbols } from '@airgap/coinlib-core'
import { TezosNetwork, TezosProtocol } from '@airgap/coinlib-core/protocols/tezos/TezosProtocol'
import {
  TezblockBlockExplorer,
  TezosProtocolNetwork,
  TezosProtocolNetworkExtras,
  TezosProtocolOptions
} from '@airgap/coinlib-core/protocols/tezos/TezosProtocolOptions'
import { ProtocolService } from '@airgap/angular-core'
import { NetworkType } from '@airgap/coinlib-core/utils/ProtocolNetwork'
import { BeaconRequestPage } from 'src/app/pages/beacon-request/beacon-request.page'
import { ErrorPage } from 'src/app/pages/error/error.page'

import { BeaconRequest, SerializedBeaconRequest, WalletStorageKey, WalletStorageService } from '../storage/storage'

@Injectable({
  providedIn: 'root'
})
export class BeaconService {
  public client: WalletClient | undefined

  constructor(
    private readonly modalController: ModalController,
    private readonly loadingController: LoadingController,
    private readonly storage: WalletStorageService,
    private readonly protocolService: ProtocolService
  ) {
    this.client = new WalletClient({ name: 'AirGap Wallet' })
    this.init()
  }

  public async init(): Promise<void> {
    await this.client.init()

    return this.client.connect(async message => {
      if (!(await this.isNetworkSupported((message as { network?: Network }).network))) {
        return this.sendNetworkNotSupportedError(message.id)
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

  public async addVaultRequest(generatedId: string, request: BeaconRequestOutputMessage, protocol: ICoinProtocol): Promise<void> {
    this.storage.setCache(generatedId, [request, protocol.identifier, protocol.options.network.identifier])
  }

  public async getVaultRequest(generatedId: string): Promise<[BeaconRequestOutputMessage, ICoinProtocol] | []> {
    let cachedRequest: [BeaconRequestOutputMessage, MainProtocolSymbols, string] = await this.storage.getCache(generatedId)
    const result: [BeaconRequestOutputMessage, ICoinProtocol] = [undefined, undefined]
    if (cachedRequest) {
      if (cachedRequest[0]) {
        result[0] = cachedRequest[0]
      }
      if (cachedRequest[1]) {
        const protocol = await this.protocolService.getProtocol(cachedRequest[1], cachedRequest[2])
        result[1] = protocol
      }
    }
    return result ? result : []
  }

  public async respond(message: BeaconResponseInputMessage): Promise<void> {
    console.log('responding', message)
    await this.client.respond(message).catch(err => console.error(err))
  }

  public async addPeer(peer: P2PPairingRequest): Promise<void> {
    const loading: HTMLIonLoadingElement = await this.loadingController.create({
      message: 'Connecting to Beacon Network...',
      duration: 3000
    })
    await loading.present()
    await this.client.addPeer(peer)
    await loading.dismiss()
  }

  public async getPeers(): Promise<P2PPairingRequest[]> {
    return this.client.getPeers() as any // TODO: Fix types
  }

  public async removePeer(peer: P2PPairingRequest): Promise<void> {
    await this.client.removePeer(peer as any, true) // TODO: Fix types
  }

  public async removeAllPeers(): Promise<void> {
    await this.client.removeAllPeers(true)
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

  public async sendAbortedError(id: string): Promise<void> {
    const responseInput = {
      id,
      type: BeaconMessageType.Error,
      errorType: BeaconErrorType.ABORTED_ERROR
    } as any // TODO: Fix type

    const response: BeaconResponseInputMessage = {
      senderId: await getSenderId(await this.client.beaconId), // TODO: Remove senderId and version from input message
      version: BEACON_VERSION,
      ...responseInput
    }
    await this.respond(response)
  }

  public async sendNetworkNotSupportedError(id: string): Promise<void> {
    const responseInput = {
      id,
      type: BeaconMessageType.Error,
      errorType: BeaconErrorType.NETWORK_NOT_SUPPORTED
    } as any // TODO: Fix type

    const response: BeaconResponseInputMessage = {
      senderId: await getSenderId(await this.client.beaconId), // TODO: Remove senderId and version from input message
      version: BEACON_VERSION,
      ...responseInput
    }
    await this.respond(response)
    await this.displayErrorPage(new Error('Network not supported!'))
  }

  public async sendAccountNotFound(id: string): Promise<void> {
    const responseInput = {
      id,
      type: BeaconMessageType.Error,
      errorType: BeaconErrorType.NO_ADDRESS_ERROR
    } as any // TODO: Fix type

    const response: BeaconResponseInputMessage = {
      senderId: await getSenderId(await this.client.beaconId), // TODO: Remove senderId and version from input message
      version: BEACON_VERSION,
      ...responseInput
    }
    await this.respond(response)
    await this.displayErrorPage(new Error('Account not found'))
  }

  public async getProtocolBasedOnBeaconNetwork(network: Network): Promise<TezosProtocol> {
    // TODO: remove `Exclude`
    const configs: {
      [key in Exclude<BeaconNetworkType, BeaconNetworkType.EDONET, BeaconNetworkType.FLORENCENET>]: TezosProtocolNetwork
    } = {
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
      [BeaconNetworkType.DELPHINET]: {
        identifier: undefined,
        name: network.name || 'Delphinet',
        type: NetworkType.TESTNET,
        rpcUrl: network.rpcUrl || 'https://tezos-delphinet-node.prod.gke.papers.tech',
        blockExplorer: new TezblockBlockExplorer('https://delphinet.tezblock.io'),
        extras: {
          network: TezosNetwork.DELPHINET,
          conseilUrl: 'https://tezos-delphinet-conseil.prod.gke.papers.tech',
          conseilNetwork: TezosNetwork.DELPHINET,
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

  public getResponseByRequestType(requestType: BeaconMessageType) {
    const map: Map<BeaconMessageType, BeaconMessageType> = new Map()
    map.set(BeaconMessageType.BroadcastRequest, BeaconMessageType.BroadcastResponse)
    map.set(BeaconMessageType.OperationRequest, BeaconMessageType.OperationResponse)
    map.set(BeaconMessageType.PermissionRequest, BeaconMessageType.PermissionResponse)
    map.set(BeaconMessageType.SignPayloadRequest, BeaconMessageType.SignPayloadResponse)

    return map.get(requestType)
  }
}
