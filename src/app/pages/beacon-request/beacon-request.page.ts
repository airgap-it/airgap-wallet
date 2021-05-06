import {
  BeaconMessageType,
  BroadcastRequestOutput,
  NetworkType as BeaconNetworkType,
  OperationRequestOutput,
  PermissionRequestOutput,
  PermissionResponseInput,
  PermissionScope,
  SigningType,
  SignPayloadRequestOutput
} from '@airgap/beacon-sdk'
import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { AlertController, ModalController } from '@ionic/angular'
import {
  AirGapMarketWallet,
  generateId,
  IACMessageDefinitionObject,
  IACMessageType,
  IAirGapTransaction,
  ICoinProtocol,
  TezosCryptoClient,
  TezosProtocol
} from '@airgap/coinlib-core'
import { MainProtocolSymbols } from '@airgap/coinlib-core'
import { TezosWrappedOperation } from '@airgap/coinlib-core/protocols/tezos/types/TezosWrappedOperation'
import { NetworkType, ProtocolNetwork } from '@airgap/coinlib-core/utils/ProtocolNetwork'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { BeaconService } from 'src/app/services/beacon/beacon.service'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { ErrorPage } from '../error/error.page'
import { ShortenStringPipe } from 'src/app/pipes/shorten-string/shorten-string.pipe'
import { TranslateService } from '@ngx-translate/core'

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
  public readonly networkType: typeof NetworkType = NetworkType

  public title: string = ''
  public request: PermissionRequestOutput | OperationRequestOutput | SignPayloadRequestOutput | BroadcastRequestOutput | undefined
  public network: ProtocolNetwork | undefined
  public requesterName: string = ''
  public inputs: CheckboxInput[] = []
  public transactions: IAirGapTransaction[] | undefined | any

  public selectableWallets: AirGapMarketWallet[] = []
  private selectedWallet: AirGapMarketWallet | undefined

  public modalRef: HTMLIonModalElement | undefined

  public blake2bHash: string | undefined

  private responseHandler: (() => Promise<void>) | undefined

  private readonly beaconService: BeaconService | undefined

  constructor(
    private readonly modalController: ModalController,
    private readonly accountService: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly shortenStringPipe: ShortenStringPipe,
    private readonly translateService: TranslateService
  ) {}

  public get address(): string {
    if (this.selectedWallet !== undefined) {
      return this.selectedWallet.receivingPublicAddress
    }
    return ''
  }

  public async ngOnInit(): Promise<void> {
    this.modalRef = await this.modalController.getTop()

    this.requesterName = this.request.appMetadata.name
    this.network = await this.getNetworkFromRequest(this.request)
    if (this.request && this.request.type === BeaconMessageType.PermissionRequest) {
      this.title = 'beacon-request.title.permission-request'
      await this.permissionRequest(this.request)
    }

    if (this.request && this.request.type === BeaconMessageType.SignPayloadRequest) {
      this.title = 'beacon-request.title.sign-payload-request'
      await this.signRequest(this.request)
    }

    if (this.request && this.request.type === BeaconMessageType.OperationRequest) {
      this.title = 'beacon-request.title.operation-request'
      await this.operationRequest(this.request)
    }

    if (this.request && this.request.type === BeaconMessageType.BroadcastRequest) {
      this.title = 'beacon-request.title.broadcast-request'
      await this.broadcastRequest(this.request)
    }
  }

  public async getNetworkFromRequest(
    request: PermissionRequestOutput | OperationRequestOutput | SignPayloadRequestOutput | BroadcastRequestOutput | undefined
  ): Promise<ProtocolNetwork | undefined> {
    if (!request || request.type === BeaconMessageType.SignPayloadRequest) {
      return undefined
    }
    const protocol: ICoinProtocol = await this.beaconService.getProtocolBasedOnBeaconNetwork(request.network)

    return protocol.options.network
  }

  public async cancel(): Promise<void> {
    await this.beaconService.sendAbortedError(this.request.id)
    await this.dismiss()
  }

  public async dismiss(): Promise<boolean | void> {
    return this.modalRef.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async done(): Promise<void> {
    if (this.responseHandler) {
      await this.responseHandler()
    }
    await this.dismiss()
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

    await modal.present()

    setTimeout(async () => {
      await this.dismiss() // TODO: This causes flickering because it's "behind" the error modal.
    }, 100)
  }

  private async permissionRequest(request: PermissionRequestOutput): Promise<void> {
    this.selectableWallets = this.accountService
      .getWalletList()
      .filter((wallet: AirGapMarketWallet) => wallet.protocol.identifier === MainProtocolSymbols.XTZ)
    if (this.selectableWallets.length > 0) {
      this.selectedWallet = this.selectableWallets[0]
    }
    if (!this.selectedWallet) {
      await this.beaconService.sendAccountNotFound(request.id)
      return
    }

    this.inputs = [
      {
        name: 'sign',
        type: 'checkbox',
        label: 'beacon-request.permission.sign-transactions',
        value: PermissionScope.SIGN,
        icon: 'create',
        checked: request.scopes.indexOf(PermissionScope.SIGN) >= 0
      },

      {
        name: 'operation_request',
        type: 'checkbox',
        label: 'beacon-request.permission.operation-request',
        value: PermissionScope.OPERATION_REQUEST,
        icon: 'color-wand',
        checked: request.scopes.indexOf(PermissionScope.OPERATION_REQUEST) >= 0
      },

      {
        name: 'threshold',
        type: 'checkbox',
        label: 'beacon-request.permission.threshold',
        value: PermissionScope.THRESHOLD,
        icon: 'code-working',
        checked: request.scopes.indexOf(PermissionScope.THRESHOLD) >= 0
      }
    ]

    this.responseHandler = async (): Promise<void> => {
      const scopes: PermissionScope[] = this.inputs.filter(input => input.checked).map(input => input.value)

      const response: PermissionResponseInput = {
        id: request.id,
        type: BeaconMessageType.PermissionResponse,
        publicKey: this.selectedWallet.publicKey,
        network: request.network,
        scopes
      }

      await this.beaconService.respond(response)
    }
  }

  public async changeAccount(): Promise<void> {
    const wallets: AirGapMarketWallet[] = this.accountService
      .getWalletList()
      .filter((wallet: AirGapMarketWallet) => wallet.protocol.identifier === MainProtocolSymbols.XTZ)

    return new Promise(async () => {
      if (wallets.length === 1) {
        return
      }
      const alert = await this.alertController.create({
        header: this.translateService.instant('beacon-request.select-account.alert'),
        inputs: wallets.map(wallet => ({
          label: this.shortenStringPipe.transform(wallet.receivingPublicAddress),
          type: 'radio',
          value: wallet,
          checked: wallet.receivingPublicAddress === this.address
        })),
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {
              this.dismiss()
            }
          },
          {
            text: 'Ok',
            handler: wallet => {
              this.selectedWallet = wallet
            }
          }
        ]
      })

      await alert.present()
    })
  }

  private async signRequest(request: SignPayloadRequestOutput): Promise<void> {
    const tezosProtocol: TezosProtocol = new TezosProtocol()
    const selectedWallet: AirGapMarketWallet = this.accountService
      .getWalletList()
      .find(
        (wallet: AirGapMarketWallet) =>
          wallet.protocol.identifier === MainProtocolSymbols.XTZ && wallet.receivingPublicAddress === request.sourceAddress
      )

    if (!selectedWallet) {
      await this.beaconService.sendAccountNotFound(request.id)
      return
    }

    // TODO: Move check to service
    if (request.signingType === SigningType.OPERATION) {
      if (!request.payload.startsWith('03')) {
        const error = new Error('When using signing type "OPERATION", the payload must start with prefix "03"')
        error.stack = undefined
        return this.displayErrorPage(error)
      }
    } else if (request.signingType === SigningType.MICHELINE) {
      if (!request.payload.startsWith('05')) {
        const error = new Error('When using signing type "MICHELINE", the payload must start with prefix "05"')
        error.stack = undefined
        return this.displayErrorPage(error)
      }
    }

    try {
      const cryptoClient = new TezosCryptoClient()
      this.blake2bHash = await cryptoClient.blake2bLedgerHash(request.payload)
    } catch {}

    const generatedId = generateId(10)
    await this.beaconService.addVaultRequest(generatedId, request, tezosProtocol)

    const clonedRequest = { ...request }
    clonedRequest.id = generatedId

    this.responseHandler = async () => {
      const info = {
        wallet: selectedWallet,
        data: clonedRequest,
        generatedId: generatedId,
        type: IACMessageType.MessageSignRequest
      }

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private async operationRequest(request: OperationRequestOutput): Promise<void> {
    let tezosProtocol: TezosProtocol = new TezosProtocol()

    const selectedWallet: AirGapMarketWallet = this.accountService
      .getWalletList()
      .find(
        (wallet: AirGapMarketWallet) =>
          wallet.protocol.identifier === MainProtocolSymbols.XTZ && wallet.receivingPublicAddress === request.sourceAddress
      )

    if (!selectedWallet) {
      await this.beaconService.sendAccountNotFound(request.id)
      return
    }

    if (request.network.type !== BeaconNetworkType.MAINNET) {
      tezosProtocol = await this.beaconService.getProtocolBasedOnBeaconNetwork(request.network)
    }

    let transaction: TezosWrappedOperation | undefined
    try {
      transaction = await tezosProtocol.prepareOperations(selectedWallet.publicKey, request.operationDetails as any)
    } catch (error) {
      return this.displayErrorPage(error)
    }
    const forgedTransaction = await tezosProtocol.forgeAndWrapOperations(transaction)

    const generatedId = generateId(10)
    await this.beaconService.addVaultRequest(generatedId, request, tezosProtocol)

    this.transactions = await tezosProtocol.getAirGapTxFromWrappedOperations({
      branch: '',
      contents: transaction.contents
    })

    this.responseHandler = async () => {
      const info = {
        wallet: selectedWallet,
        airGapTxs: await tezosProtocol.getTransactionDetails({ publicKey: selectedWallet.publicKey, transaction: forgedTransaction }),
        data: forgedTransaction,
        generatedId: generatedId,
        type: IACMessageType.TransactionSignRequest
      }

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private async broadcastRequest(request: BroadcastRequestOutput): Promise<void> {
    let tezosProtocol: TezosProtocol = new TezosProtocol()
    const signedTx: string = request.signedTransaction

    if (request.network.type !== BeaconNetworkType.MAINNET) {
      tezosProtocol = await this.beaconService.getProtocolBasedOnBeaconNetwork(request.network)
    }

    const generatedId = generateId(10)
    await this.beaconService.addVaultRequest(generatedId, request, tezosProtocol)

    this.transactions = await tezosProtocol.getTransactionDetailsFromSigned({
      accountIdentifier: '',
      transaction: signedTx
    })

    const messageDefinitionObject: IACMessageDefinitionObject = {
      id: generatedId,
      type: IACMessageType.MessageSignResponse,
      protocol: MainProtocolSymbols.XTZ,
      payload: {
        accountIdentifier: '',
        transaction: signedTx // wait for SDK to correctly serialize
      }
    }

    this.responseHandler = async () => {
      const info = {
        messageDefinitionObjects: [messageDefinitionObject]
      }

      this.dataService.setData(DataServiceKey.TRANSACTION, info)
      this.router.navigateByUrl(`/transaction-confirm/${DataServiceKey.TRANSACTION}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }
}
