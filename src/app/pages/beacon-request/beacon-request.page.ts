import { Router } from '@angular/router'
import { Component, OnInit } from '@angular/core'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { ModalController } from '@ionic/angular'

import {
  BaseMessage,
  MessageTypes,
  SignPayloadRequest,
  OperationRequest,
  PermissionResponse,
  PermissionRequest,
  BroadcastRequest
} from '@airgap/beacon-sdk/dist/client/Messages'
import { WalletCommunicationClient } from '@airgap/beacon-sdk'
import { Serializer } from '@airgap/beacon-sdk/dist/client/Serializer'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { IACMessageDefinitionObject, IACMessageType } from 'airgap-coin-lib'
import { BeaconService } from 'src/app/services/beacon/beacon.service'

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
  requesterName: string = ''
  address: string
  dappInfo: { name: string; pubKey: string }
  client: WalletCommunicationClient
  inputs?: any

  responseHandler: (() => Promise<void>) | undefined

  constructor(
    private readonly modalController: ModalController,
    private readonly accountService: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router,
    private readonly beaconService: BeaconService
  ) {
    if (request && request.name) {
      this.requesterName = request.name
    }
  }

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
        icon: 'eye',
        checked: request.scope.indexOf('read_address') >= 0
      },

      {
        name: 'sign',
        type: 'checkbox',
        label: 'Sign transactions',
        value: 'sign',
        icon: 'create',
        checked: request.scope.indexOf('sign') >= 0
      },

      {
        name: 'operation_request',
        type: 'checkbox',
        label: 'Operation request',
        value: 'operation_request',
        icon: 'color-wand',
        checked: request.scope.indexOf('operation_request') >= 0
      },

      {
        name: 'threshold',
        type: 'checkbox',
        label: 'Threshold',
        value: 'threshold',
        icon: 'code-working',
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

      this.beaconService.respond(request.id, serialized)
    }
  }

  private async signRequest(request: SignPayloadRequest): Promise<void> {
    console.log(request)
  }

  private async operationRequest(request: OperationRequest): Promise<void> {
    console.log(request)
  }

  private async broadcastRequest(_request: BroadcastRequest): Promise<void> {
    // const signedTx = request.signedTransaction[0]
    let signedTransactionSync: IACMessageDefinitionObject = {
      type: IACMessageType.MessageSignResponse,
      protocol: 'xtz',
      payload: {
        accountIdentifier: '',
        // transaction: signedTx // wait for SDK to correctly serialize
        transaction:
          '1ef017b560494ae7b102be63f4d64e64d70114ff4652df23f34ae4460645b3266b00641b67c32672f0b11263b89b05b51e42faa64a3f940ad8d79101904e0000c64ac48e550c2c289af4c5ce5fe52ca7ba7a91d1a411745313e154eff8d118f16c00641b67c32672f0b11263b89b05b51e42faa64a3fdc0bd9d79101bc5000000000641b67c32672f0b11263b89b05b51e42faa64a3f0085dcfbba4a00c5b4f89914c1819ccd8466f6328b74073d50406394e59fe32d89e62112fec2d5a9bc1e6787206fe50e26f90999ae3061ca76247b57e08b6e490a'
      }
    }

    this.responseHandler = async () => {
      const info = {
        signedTransactionSync: signedTransactionSync
      }

      this.dataService.setData(DataServiceKey.TRANSACTION, info)
      this.router.navigateByUrl(`/transaction-confirm/${DataServiceKey.TRANSACTION}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }
}
