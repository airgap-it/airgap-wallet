import { Injectable } from '@angular/core'
import { SettingsKey, StorageProvider } from '../storage/storage'
import { WalletCommunicationClient } from '@airgap/beacon-sdk'
import { Serializer } from '@airgap/beacon-sdk/dist/client/Serializer'
import { MessageTypes, PermissionRequest, BaseRequest, PermissionResponse } from '@airgap/beacon-sdk/dist/client/Messages'
import { AlertController } from '@ionic/angular'

@Injectable({
  providedIn: 'root'
})
export class CommunicationService {
  private client: WalletCommunicationClient | undefined
  constructor(private readonly storageService: StorageProvider, private readonly alertController: AlertController) {
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
    knownPeers.forEach(peer => {
      this.listen(peer.pubKey) // TODO: Prevent channels from being opened multiple times
    })
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
        if (deserializedMessage.type === MessageTypes.PermissionRequest) {
          const permissionRequest = deserializedMessage as PermissionRequest
          this.alertController
            .create({
              header: 'Permission request',
              message: 'Do you want to give the dapp permissions to do all the things?',
              inputs: [
                {
                  name: 'read_address',
                  type: 'checkbox',
                  label: 'Read Address',
                  value: 'read_address',
                  checked: permissionRequest.scope.indexOf('read_address') >= 0
                },

                {
                  name: 'sign',
                  type: 'checkbox',
                  label: 'Sign',
                  value: 'sign',
                  checked: permissionRequest.scope.indexOf('sign') >= 0
                },

                {
                  name: 'operation_request',
                  type: 'checkbox',
                  label: 'Operation request',
                  value: 'operation_request',
                  checked: permissionRequest.scope.indexOf('operation_request') >= 0
                },

                {
                  name: 'threshold',
                  type: 'checkbox',
                  label: 'Threshold',
                  value: 'threshold',
                  checked: permissionRequest.scope.indexOf('threshold') >= 0
                }
              ],
              buttons: [
                {
                  text: 'Ok',
                  handler: grantedPermissions => {
                    console.log('SATISFIED')
                    const response: PermissionResponse = {
                      id: permissionRequest.id,
                      type: MessageTypes.PermissionResponse,
                      permissions: {
                        pubkey: '',
                        networks: ['mainnet'],
                        scopes: grantedPermissions
                      }
                    }

                    const serializedMessage = serializer.serialize(response)
                    this.client.sendMessage(pubKey, serializedMessage)
                    console.log('WALLET ALLOWED PERMISSION')
                  }
                },
                {
                  text: 'Cancel',
                  role: 'cancel'
                }
              ]
            })
            .then(alert => {
              alert.present()
            })
        }
      } catch (error) {}
    })
  }

  public async sendMessage(pubKey: string, message: string) {
    if (!this.client) {
      throw new Error('Client not ready')
    }
    console.log('opening channel')
    this.client.sendMessage(pubKey, message) // TODO: Should we have a confirmation here?
  }
}
