import { Router } from '@angular/router'
import { Component, OnInit } from '@angular/core'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { ModalController } from '@ionic/angular'

import {
  WalletClient,
  BeaconBaseMessage,
  BeaconMessageType,
  SignPayloadRequest,
  OperationRequest,
  PermissionResponse,
  PermissionRequest,
  BroadcastRequest,
  PermissionScope,
  BeaconErrorMessage,
  BeaconErrorType
} from '@airgap/beacon-sdk'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { IACMessageDefinitionObject, IACMessageType, TezosProtocol, IAirGapTransaction } from 'airgap-coin-lib'
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
  public title: string = ''
  public request: BeaconBaseMessage | undefined
  public requesterName: string = ''
  public address: string = ''

  dappInfo: { name: string; pubKey: string }
  client: WalletClient
  inputs?: any
  private beaconService: BeaconService | undefined

  responseHandler: (() => Promise<void>) | undefined
  public transactions: IAirGapTransaction[] | undefined

  constructor(
    private readonly modalController: ModalController,
    private readonly accountService: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router,
    private readonly serializerService: SerializerService
  ) {}

  ngOnInit() {
    console.log('new request', this.request)
    if (isUnknownObject(this.request) && this.request.type === BeaconMessageType.PermissionRequest) {
      this.title = 'Permission Request'
      this.requesterName = ((this.request as any) as PermissionRequest).appMetadata.name
      this.permissionRequest((this.request as any) as PermissionRequest)
    }

    if (isUnknownObject(this.request) && this.request.type === BeaconMessageType.SignPayloadRequest) {
      this.title = 'Sign Payload Request'
      this.requesterName = 'dApp Name (placeholder)'
      this.signRequest((this.request as any) as SignPayloadRequest)
    }

    if (isUnknownObject(this.request) && this.request.type === BeaconMessageType.OperationRequest) {
      this.title = 'Operation Request'
      this.requesterName = 'dApp Name (placeholder)'
      this.operationRequest((this.request as any) as OperationRequest)
    }

    if (isUnknownObject(this.request) && this.request.type === BeaconMessageType.BroadcastRequest) {
      this.title = 'Broadcast Request'
      this.requesterName = 'dApp Name (placeholder)'
      this.broadcastRequest((this.request as any) as BroadcastRequest)
    }
  }

  public async dismiss() {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async done() {
    if (this.responseHandler) {
      await this.responseHandler()
    }
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
        checked: request.scopes.indexOf(PermissionScope.READ_ADDRESS) >= 0
      },

      {
        name: 'sign',
        type: 'checkbox',
        label: 'Sign transactions',
        value: 'sign',
        icon: 'create',
        checked: request.scopes.indexOf(PermissionScope.SIGN) >= 0
      },

      {
        name: 'operation_request',
        type: 'checkbox',
        label: 'Operation request',
        value: 'operation_request',
        icon: 'color-wand',
        checked: request.scopes.indexOf(PermissionScope.OPERATION_REQUEST) >= 0
      },

      {
        name: 'threshold',
        type: 'checkbox',
        label: 'Threshold',
        value: 'threshold',
        icon: 'code-working',
        checked: request.scopes.indexOf(PermissionScope.THRESHOLD) >= 0
      }
    ]

    this.responseHandler = async () => {
      const scopes = this.inputs.filter(input => input.checked).map(input => input.value)
      if (scopes.length > 0) {
        const response: PermissionResponse = {
          id: request.id,
          beaconId: '',
          type: BeaconMessageType.PermissionResponse,
          accountIdentifier: `${wallet.publicKey}-${request.network.name}`,
          pubkey: wallet.publicKey,
          network: request.network,
          scopes: scopes
        }

        this.beaconService.respond(response)
      } else {
        const response: BeaconErrorMessage = {
          id: request.id,
          beaconId: '',
          type: BeaconMessageType.PermissionResponse,
          errorType: BeaconErrorType.NOT_GRANTED_ERROR
        }
        this.beaconService.respond(response)
      }
    }
  }

  private async signRequest(request: SignPayloadRequest): Promise<void> {
    const tezosProtocol = new TezosProtocol()
    this.transactions = await tezosProtocol.getTransactionDetails({
      publicKey: '',
      transaction: { binaryTransaction: request.payload }
    })

    const wallet = this.accountService.getWalletList().find(wallet => wallet.coinProtocol.identifier === 'xtz')
    if (!wallet) {
      throw new Error('no wallet found!')
    }

    await this.beaconService.addVaultRequest(request.id, request.payload)

    this.responseHandler = async () => {
      const transaction = { binaryTransaction: request.payload }
      const serializedChunks = await this.serializerService.serialize([
        {
          protocol: wallet.coinProtocol.identifier,
          type: IACMessageType.TransactionSignRequest,
          payload: {
            publicKey: wallet.publicKey,
            transaction,
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

    const transaction = await tezosProtocol.prepareOperations(wallet.publicKey, request.operationDetails as any)
    const forgedTransaction = await tezosProtocol.forgeAndWrapOperations(transaction)

    await this.beaconService.addVaultRequest(request.id, forgedTransaction)

    this.transactions = tezosProtocol.getAirGapTxFromWrappedOperations({
      branch: '',
      contents: transaction.contents
    })

    this.responseHandler = async () => {
      const serializedChunks = await this.serializerService.serialize([
        {
          protocol: wallet.coinProtocol.identifier,
          type: IACMessageType.TransactionSignRequest,
          payload: {
            publicKey: wallet.publicKey,
            transaction: forgedTransaction,
            callback: 'airgap-wallet://?d='
          }
        }
      ])
      const info = {
        wallet,
        airGapTxs: await tezosProtocol.getTransactionDetails({ publicKey: wallet.publicKey, transaction: forgedTransaction }),
        data: serializedChunks
      }

      console.log('info', info)

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private async broadcastRequest(request: BroadcastRequest): Promise<void> {
    const tezosProtocol = new TezosProtocol()
    const signedTx: string = request.signedTransaction

    await this.beaconService.addVaultRequest(request.id, signedTx)

    this.transactions = await tezosProtocol.getTransactionDetailsFromSigned({
      accountIdentifier: '',
      transaction: signedTx
    })

    let signedTransactionSync: IACMessageDefinitionObject = {
      type: IACMessageType.MessageSignResponse,
      protocol: 'xtz',
      payload: {
        accountIdentifier: '',
        transaction: signedTx // wait for SDK to correctly serialize
      }
    }

    this.responseHandler = async () => {
      const info = {
        signedTransactionsSync: [signedTransactionSync]
      }

      this.dataService.setData(DataServiceKey.TRANSACTION, info)
      this.router.navigateByUrl(`/transaction-confirm/${DataServiceKey.TRANSACTION}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }
}
