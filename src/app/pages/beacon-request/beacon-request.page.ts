import { Component, OnInit } from '@angular/core'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { ModalController } from '@ionic/angular'
import {
  BaseMessage,
  MessageTypes,
  SignPayloadRequest,
  OperationRequest,
  BroadcastRequest,
  PermissionResponse,
  PermissionRequest
} from '@airgap/beacon-sdk/dist/client/Messages'
import { WalletCommunicationClient } from '@airgap/beacon-sdk'
import { Serializer } from '@airgap/beacon-sdk/dist/client/Serializer'
import { AccountProvider } from 'src/app/services/account/account.provider'

export function isUnknownObject(x: unknown): x is { [key in PropertyKey]: unknown } {
  return x !== null && typeof x === 'object'
}

@Component({
  selector: 'app-beacon-request',
  templateUrl: './beacon-request.page.html',
  styleUrls: ['./beacon-request.page.scss']
})
export class BeaconRequestPage implements OnInit {
  request: BaseMessage
  address: string
  dappInfo: { pubKey: string }
  client: WalletCommunicationClient
  inputs?: any

  responseHandler: (() => Promise<void>) | undefined

  constructor(private readonly modalController: ModalController, private readonly accountService: AccountProvider) {}

  ngOnInit() {
    if (isUnknownObject(this.request) && this.request.type === MessageTypes.PermissionRequest) {
      this.permissionRequest((this.request as any) as PermissionRequest)
    }

    if (isUnknownObject(this.request) && this.request.type === MessageTypes.SignPayloadRequest) {
      this.signRequest((this.request as any) as SignPayloadRequest)
    }

    if (isUnknownObject(this.request) && this.request.type === MessageTypes.OperationRequest) {
      this.operationRequest((this.request as any) as OperationRequest)
    }

    if (isUnknownObject(this.request) && this.request.type === MessageTypes.BroadcastRequest) {
      this.broadcastRequest((this.request as any) as BroadcastRequest)
    }
  }

  public async dismiss() {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async done() {
    await this.responseHandler()
    this.dismiss()
  }

  private async permissionRequest(request: PermissionRequest): Promise<void> {
    const wallet = this.accountService.getWalletList().find(wallet => wallet.coinProtocol.identifier === 'xtz')
    if (!wallet) {
      throw new Error('no wallet found!')
    }
    this.address = await wallet.coinProtocol.getAddressFromPublicKey(wallet.publicKey)

    this.inputs = [
      {
        name: 'read_address',
        type: 'checkbox',
        label: 'Read Address',
        value: 'read_address',
        checked: request.scope.indexOf('read_address') >= 0
      },

      {
        name: 'sign',
        type: 'checkbox',
        label: 'Sign',
        value: 'sign',
        checked: request.scope.indexOf('sign') >= 0
      },

      {
        name: 'operation_request',
        type: 'checkbox',
        label: 'Operation request',
        value: 'operation_request',
        checked: request.scope.indexOf('operation_request') >= 0
      },

      {
        name: 'threshold',
        type: 'checkbox',
        label: 'Threshold',
        value: 'threshold',
        checked: request.scope.indexOf('threshold') >= 0
      }
    ]

    this.responseHandler = async () => {
      const response: PermissionResponse = {
        id: request.id,
        type: MessageTypes.PermissionResponse,
        permissions: {
          pubkey: wallet.publicKey,
          networks: ['mainnet'],
          scopes: this.inputs.filter(input => input.checked).map(input => input.value)
        }
      }
      const serialized = new Serializer().serialize(response)

      this.client.sendMessage(this.dappInfo.pubKey, serialized)
    }
  }

  private async signRequest(request: SignPayloadRequest): Promise<void> {
    console.log(request)
  }

  private async operationRequest(request: OperationRequest): Promise<void> {
    console.log(request)
  }

  private async broadcastRequest(request: BroadcastRequest): Promise<void> {
    console.log(request)
  }
}
