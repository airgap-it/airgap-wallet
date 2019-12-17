import { Injectable } from '@angular/core'

import { SettingsKey, StorageProvider } from '../storage/storage'

import { WalletCommunicationClient } from './WalletCommunicationClient'

@Injectable({
  providedIn: 'root'
})
export class CommunicationService {
  private client: WalletCommunicationClient | undefined
  constructor(private readonly storageService: StorageProvider) {
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
  }

  public async openChannel(pubKey: string, relayServer: string) {
    if (!this.client) {
      throw new Error('Client not ready')
    }
    console.log('opening channel')
    this.client.openChannel(pubKey, relayServer) // TODO: Should we have a confirmation here?

    this.client.listenForEncryptedMessage(pubKey, message => {
      console.log('WALLET gotEncryptedMessage:', message)
    })
  }
}
