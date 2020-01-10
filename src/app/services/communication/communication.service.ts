import { Injectable } from '@angular/core'
import { SettingsKey, StorageProvider } from '../storage/storage'
import { WalletCommunicationClient } from '@airgap/beacon-sdk'
import { Serializer } from '@airgap/beacon-sdk/dist/client/Serializer'
import { BaseRequest } from '@airgap/beacon-sdk/dist/client/Messages'
import { ModalController } from '@ionic/angular'
import { BeaconRequestPage } from 'src/app/pages/beacon-request/beacon-request.page'

@Injectable({
  providedIn: 'root'
})
export class CommunicationService {
  private client: WalletCommunicationClient | undefined
  constructor(private readonly storageService: StorageProvider, private readonly modalController: ModalController) {
    this.init()
  }

  public async init(): Promise<void> {
    let seed: string | undefined = await this.storageService.get(SettingsKey.COMMUNICATION_PRIVATE_SEED)
    if (!seed) {
      seed = Math.random()
        .toString()
        .replace('.', '')
      await this.storageService.set(SettingsKey.COMMUNICATION_PRIVATE_SEED, seed)
    }
    this.client = new WalletCommunicationClient('BEACON', seed, 1, true)
    await this.client.start()
    const knownPeers = await this.storageService.get(SettingsKey.COMMUNICATION_KNOWN_PEERS)

    const connectionPromises = knownPeers.map(async peer => this.listen(peer.pubKey)) // TODO: Prevent channels from being opened multiple times
    await Promise.all(connectionPromises)
  }

  public async addPeer(pubKey: string, relayServer: string) {
    // We got a new pairing request. Let's check if we're already connected and save the pubkey.
    const knownPeers = await this.storageService.get(SettingsKey.COMMUNICATION_KNOWN_PEERS)
    if (!knownPeers.some(peer => peer.pubKey === pubKey)) {
      knownPeers.push({
        pubKey,
        relayServer
      })
      this.storageService.set(SettingsKey.COMMUNICATION_KNOWN_PEERS, knownPeers)
    }
    console.log('opening channel')
    await this.client.openChannel(pubKey, relayServer) // TODO: Should we have a confirmation here?
    this.listen(pubKey) // TODO: Prevent channels from being opened multiple times
  }

  public async listen(pubKey: string) {
    if (!this.client) {
      throw new Error('Client not ready')
    }
    console.log('listening to', pubKey)

    this.client.listenForEncryptedMessage(pubKey, message => {
      console.log('WALLET gotEncryptedMessage:', message)

      console.log('typeof', typeof message)
      try {
        const serializer = new Serializer()
        const deserializedMessage = serializer.deserialize(message.toString()) as BaseRequest
        console.log('deserializedMessage.id', deserializedMessage.id)

        this.presentModal(deserializedMessage, { pubKey })
      } catch (error) {}
    })
  }

  async presentModal(request: BaseRequest, dappInfo: { pubKey: string }) {
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

  public async sendMessage(pubKey: string, message: string) {
    if (!this.client) {
      throw new Error('Client not ready')
    }
    console.log('opening channel')
    this.client.sendMessage(pubKey, message) // TODO: Should we have a confirmation here?
  }
}
