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
} from '@airgap/beacon-sdk/dist/messages/Messages'
import { NotGrantedBeaconError, BeaconErrors } from '@airgap/beacon-sdk/dist/messages/Errors'
import { WalletCommunicationClient } from '@airgap/beacon-sdk'
import { Serializer } from '@airgap/beacon-sdk/dist/Serializer'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { IACMessageDefinitionObject, IACMessageType, TezosProtocol } from 'airgap-coin-lib'
import { BeaconService } from 'src/app/services/beacon/beacon.service'
import { SerializerService } from 'src/app/services/serializer/serializer.service'

export function isUnknownObject(x: unknown): x is { [key in PropertyKey]: unknown } {
  return x !== null && typeof x === 'object'
}

@Component({
  selector: 'page-beacon-request',
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
    private readonly beaconService: BeaconService,
    private readonly serializerService: SerializerService
  ) {}

  ngOnInit() {
    if (isUnknownObject(this.request) && this.request.type === MessageTypes.PermissionRequest) {
      this.requesterName = ((this.request as any) as PermissionRequest).name
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
      const scopes = this.inputs.filter(input => input.checked).map(input => input.value)
      if (scopes.length > 0) {
        const response: PermissionResponse = {
          id: request.id,
          type: MessageTypes.PermissionResponse,
          permissions: {
            pubkey: wallet.publicKey,
            networks: ['mainnet'],
            scopes: scopes
          }
        }

        const serialized = new Serializer().serialize(response)
        this.beaconService.respond(request.id, serialized)
      } else {
        const response: NotGrantedBeaconError = {
          id: request.id,
          type: MessageTypes.PermissionResponse,
          error: BeaconErrors.NOT_GRANTED_ERROR
        }
        const serialized = new Serializer().serialize(response)
        this.beaconService.respond(request.id, serialized)
      }
    }
  }

  private async signRequest(request: SignPayloadRequest): Promise<void> {
    const tezosProtocol = new TezosProtocol()

    const wallet = this.accountService.getWalletList().find(wallet => wallet.coinProtocol.identifier === 'xtz')
    if (!wallet) {
      throw new Error('no wallet found!')
    }

    this.responseHandler = async () => {
      const transaction = { binaryTransaction: request.payload[0] as any }
      const serializedChunks = await this.serializerService.serialize([
        {
          protocol: wallet.coinProtocol.identifier,
          type: IACMessageType.TransactionSignRequest,
          payload: {
            publicKey: wallet.publicKey,
            transaction: transaction, // TODO: Type
            callback: 'airgap-wallet://?d='
          }
        }
      ])
      const info = {
        wallet,
        airGapTxs: await tezosProtocol.getTransactionDetails({ publicKey: wallet.publicKey, transaction }),
        data: serializedChunks
      }

      console.log('info', info)

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private async operationRequest(request: OperationRequest): Promise<void> {
    const tezosProtocol = new TezosProtocol()

    const wallet = this.accountService.getWalletList().find(wallet => wallet.coinProtocol.identifier === 'xtz')
    if (!wallet) {
      throw new Error('no wallet found!')
    }

    this.responseHandler = async () => {
      const transaction = await tezosProtocol.prepareOperations(wallet.publicKey, request.operationDetails as any)
      const serializedChunks = await this.serializerService.serialize([
        {
          protocol: wallet.coinProtocol.identifier,
          type: IACMessageType.TransactionSignRequest,
          payload: {
            publicKey: wallet.publicKey,
            transaction: transaction as any, // TODO: Type
            callback: 'airgap-wallet://?d='
          }
        }
      ])
      const info = {
        wallet,
        airGapTxs: await tezosProtocol.getTransactionDetails({ publicKey: wallet.publicKey, transaction }),
        data: serializedChunks
      }

      console.log('info', info)

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private async broadcastRequest(request: BroadcastRequest): Promise<void> {
    // const signedTx = request.signedTransaction[0]
    let signedTransactionSync: IACMessageDefinitionObject = {
      type: IACMessageType.MessageSignResponse,
      protocol: 'xtz',
      payload: {
        accountIdentifier: '',
        // transaction: signedTx // wait for SDK to correctly serialize
        transaction: request.signedTransactions[0] as any
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
