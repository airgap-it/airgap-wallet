import { BeaconErrorMessage, BeaconErrorType, BeaconMessageType, PermissionScope } from '@airgap/beacon-sdk'
import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { ModalController } from '@ionic/angular'
import { IACMessageDefinitionObject, IACMessageType, IAirGapTransaction, TezosProtocol, AirGapMarketWallet } from 'airgap-coin-lib'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { BeaconService } from 'src/app/services/beacon/beacon.service'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { SerializerService } from 'src/app/services/serializer/serializer.service'
import {
  PermissionRequestOutput,
  OperationRequestOutput,
  SignPayloadRequestOutput,
  BroadcastRequestOutput,
  PermissionResponseInput
} from '@airgap/beacon-sdk'

export function isUnknownObject(x: unknown): x is { [key in PropertyKey]: unknown } {
  return x !== null && typeof x === 'object'
}

interface CheckboxInput {
  name: string
  type: 'radio' | 'checkbox'
  label: string
  value: PermissionScope
  icon: string
  checked: boolean
}

@Component({
  selector: 'page-beacon-request',
  templateUrl: './beacon-request.page.html',
  styleUrls: ['./beacon-request.page.scss']
})
export class BeaconRequestPage implements OnInit {
  public title: string = ''
  public request: PermissionRequestOutput | OperationRequestOutput | SignPayloadRequestOutput | BroadcastRequestOutput | undefined
  public requesterName: string = ''
  public address: string = ''
  public inputs: CheckboxInput[] = []
  public transactions: IAirGapTransaction[] | undefined

  private responseHandler: (() => Promise<void>) | undefined

  private readonly beaconService: BeaconService | undefined

  constructor(
    private readonly modalController: ModalController,
    private readonly accountService: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router,
    private readonly serializerService: SerializerService
  ) {}

  public async ngOnInit(): Promise<void> {
    console.log('new request', this.request)
    this.requesterName = this.request.appMetadata.name
    if (this.request && this.request.type === BeaconMessageType.PermissionRequest) {
      this.title = 'Permission Request'
      await this.permissionRequest(this.request)
    }

    if (this.request && this.request.type === BeaconMessageType.SignPayloadRequest) {
      this.title = 'Sign Payload Request'
      await this.signRequest(this.request)
    }

    if (this.request && this.request.type === BeaconMessageType.OperationRequest) {
      this.title = 'Operation Request'
      await this.operationRequest(this.request)
    }

    if (this.request && this.request.type === BeaconMessageType.BroadcastRequest) {
      this.title = 'Broadcast Request'
      await this.broadcastRequest(this.request)
    }
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async done(): Promise<void> {
    if (this.responseHandler) {
      await this.responseHandler()
    }
    await this.dismiss()
  }

  private async permissionRequest(request: PermissionRequestOutput): Promise<void> {
    const selectedWallet: AirGapMarketWallet = this.accountService
      .getWalletList()
      .find((wallet: AirGapMarketWallet) => wallet.coinProtocol.identifier === 'xtz') // TODO: Add wallet selection
    if (!selectedWallet) {
      throw new Error('no wallet found!')
    }
    this.address = await selectedWallet.coinProtocol.getAddressFromPublicKey(selectedWallet.publicKey)

    this.inputs = [
      {
        name: 'sign',
        type: 'checkbox',
        label: 'Sign transactions',
        value: PermissionScope.SIGN,
        icon: 'create',
        checked: request.scopes.indexOf(PermissionScope.SIGN) >= 0
      },

      {
        name: 'operation_request',
        type: 'checkbox',
        label: 'Operation request',
        value: PermissionScope.OPERATION_REQUEST,
        icon: 'color-wand',
        checked: request.scopes.indexOf(PermissionScope.OPERATION_REQUEST) >= 0
      },

      {
        name: 'threshold',
        type: 'checkbox',
        label: 'Threshold',
        value: PermissionScope.THRESHOLD,
        icon: 'code-working',
        checked: request.scopes.indexOf(PermissionScope.THRESHOLD) >= 0
      }
    ]

    this.responseHandler = async (): Promise<void> => {
      const scopes: PermissionScope[] = this.inputs.filter(input => input.checked).map(input => input.value)
      if (scopes.length > 0) {
        const response: PermissionResponseInput = {
          id: request.id,
          type: BeaconMessageType.PermissionResponse,
          publicKey: selectedWallet.publicKey,
          network: request.network,
          scopes
        }

        await this.beaconService.respond(response)
      } else {
        const response: Omit<BeaconErrorMessage, 'beaconId' | 'version'> = {
          id: request.id,
          type: BeaconMessageType.PermissionResponse,
          errorType: BeaconErrorType.NOT_GRANTED_ERROR
        }
        await this.beaconService.respond(response as any)
      }
    }
  }

  private async signRequest(request: SignPayloadRequestOutput): Promise<void> {
    const tezosProtocol: TezosProtocol = new TezosProtocol()
    this.transactions = await tezosProtocol.getTransactionDetails({
      publicKey: '',
      transaction: { binaryTransaction: request.payload }
    })

    const selectedWallet: AirGapMarketWallet = this.accountService
      .getWalletList()
      .find((wallet: AirGapMarketWallet) => wallet.coinProtocol.identifier === 'xtz') // TODO: Add wallet selection

    if (!selectedWallet) {
      throw new Error('no wallet found!')
    }

    await this.beaconService.addVaultRequest(request.id, request.payload)

    this.responseHandler = async () => {
      const transaction = { binaryTransaction: request.payload }
      const serializedChunks = await this.serializerService.serialize([
        {
          protocol: selectedWallet.coinProtocol.identifier,
          type: IACMessageType.TransactionSignRequest,
          payload: {
            publicKey: selectedWallet.publicKey,
            transaction,
            callback: 'airgap-wallet://?d='
          }
        }
      ])
      const info = {
        wallet: selectedWallet,
        airGapTxs: await tezosProtocol.getTransactionDetails({ publicKey: selectedWallet.publicKey, transaction }),
        data: serializedChunks
      }

      console.log('info', info)

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private async operationRequest(request: OperationRequestOutput): Promise<void> {
    const tezosProtocol: TezosProtocol = new TezosProtocol()

    const selectedWallet: AirGapMarketWallet = this.accountService
      .getWalletList()
      .find((wallet: AirGapMarketWallet) => wallet.coinProtocol.identifier === 'xtz') // TODO: Add wallet selection

    if (!selectedWallet) {
      throw new Error('no wallet found!')
    }

    const transaction = await tezosProtocol.prepareOperations(selectedWallet.publicKey, request.operationDetails as any)
    const forgedTransaction = await tezosProtocol.forgeAndWrapOperations(transaction)

    await this.beaconService.addVaultRequest(request.id, forgedTransaction)

    this.transactions = tezosProtocol.getAirGapTxFromWrappedOperations({
      branch: '',
      contents: transaction.contents
    })

    this.responseHandler = async () => {
      const serializedChunks = await this.serializerService.serialize([
        {
          protocol: selectedWallet.coinProtocol.identifier,
          type: IACMessageType.TransactionSignRequest,
          payload: {
            publicKey: selectedWallet.publicKey,
            transaction: forgedTransaction,
            callback: 'airgap-wallet://?d='
          }
        }
      ])
      const info = {
        wallet: selectedWallet,
        airGapTxs: await tezosProtocol.getTransactionDetails({ publicKey: selectedWallet.publicKey, transaction: forgedTransaction }),
        data: serializedChunks
      }

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private async broadcastRequest(request: BroadcastRequestOutput): Promise<void> {
    const tezosProtocol: TezosProtocol = new TezosProtocol()
    const signedTx: string = request.signedTransaction

    await this.beaconService.addVaultRequest(request.id, signedTx)

    this.transactions = await tezosProtocol.getTransactionDetailsFromSigned({
      accountIdentifier: '',
      transaction: signedTx
    })

    const signedTransactionSync: IACMessageDefinitionObject = {
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
