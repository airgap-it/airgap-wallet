import { AcurastProtocol } from '@airgap/acurast'
import { createV0AcurastProtocol, createV0TezosProtocol, ICoinProtocolAdapter } from '@airgap/angular-core'
import {
  BeaconMessageType,
  BroadcastRequestOutput,
  NetworkType as BeaconNetworkType,
  OperationRequestOutput,
  PermissionRequestOutput,
  PermissionResponseInput,
  PermissionScope,
  SigningType,
  SignPayloadRequestOutput,
  BeaconMessageWrapper,
  SubstratePermissionRequest,
  SubstratePermissionResponse,
  SubstrateSignPayloadRequest,
  SubstrateTransferRequest,
  SubstrateMessageType
} from '@airgap/beacon-sdk'
import { AirGapMarketWallet, AirGapWalletStatus, IAirGapTransaction, ICoinProtocol, MainProtocolSymbols } from '@airgap/coinlib-core'
import { isHex } from '@airgap/coinlib-core/utils/hex'
import { ProtocolNetwork } from '@airgap/coinlib-core/utils/ProtocolNetwork'
import { newPublicKey, PublicKey } from '@airgap/module-kit'
import { generateId, IACMessageDefinitionObjectV3, IACMessageType } from '@airgap/serializer'
import { TezosCryptoClient, TezosProtocol, TezosTransactionSignRequest, TezosWrappedOperation } from '@airgap/tezos'
import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { AlertController, ModalController, ToastController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import BigNumber from 'bignumber.js'
import * as bs58check from 'bs58check'
import { Subscription } from 'rxjs'
import { CheckboxInput } from 'src/app/components/permission-request/permission-request.component'
import { ShortenStringPipe } from 'src/app/pipes/shorten-string/shorten-string.pipe'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { BeaconService } from 'src/app/services/beacon/beacon.service'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

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
  public request?: PermissionRequestOutput | OperationRequestOutput | SignPayloadRequestOutput | BroadcastRequestOutput | undefined
  public requestSubstrateV3?: BeaconMessageWrapper<SubstratePermissionRequest | SubstrateSignPayloadRequest | undefined>
  public network: ProtocolNetwork | undefined
  public requesterName: string = ''
  public inputs: CheckboxInput[] = []
  public transactions: IAirGapTransaction[] | undefined | any
  public wrappedOperation: TezosWrappedOperation | undefined
  public selectableWallets: AirGapMarketWallet[] = []
  private selectedWallet: AirGapMarketWallet | undefined

  public modal: HTMLIonModalElement | undefined

  public blake2bHash: string | undefined
  private subscription: Subscription

  public responseHandler: (() => Promise<void>) | undefined
  private readonly beaconService: BeaconService | undefined

  public constructor(
    private readonly modalController: ModalController,
    private readonly accountService: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly shortenStringPipe: ShortenStringPipe,
    private readonly translateService: TranslateService,
    private readonly toastController: ToastController
  ) {}

  public get address(): string {
    if (this.selectedWallet !== undefined) {
      return this.selectedWallet.receivingPublicAddress
    }
    return ''
  }

  public async ngOnInit(): Promise<void> {
    this.subscription = this.accountService.allWallets$.asObservable().subscribe((wallets: AirGapMarketWallet[]) => {
      this.selectableWallets = wallets.filter((wallet: AirGapMarketWallet) => {
        if (this.requestSubstrateV3) {
          return wallet.protocol.identifier === MainProtocolSymbols.ACURAST && wallet.status === AirGapWalletStatus.ACTIVE
        } else {
          return wallet.protocol.identifier === MainProtocolSymbols.XTZ && wallet.status === AirGapWalletStatus.ACTIVE
        }
      })
    })

    if (this.requestSubstrateV3) {
      if ('appMetadata' in this.requestSubstrateV3.message.blockchainData) {
        this.requesterName = this.requestSubstrateV3.message.blockchainData.appMetadata.name
      } else {
        this.requesterName = 'Unknown App'
      }
      this.network = await this.getNetworkFromRequestAcurast(this.requestSubstrateV3)

      if (this.requestSubstrateV3.message.type === BeaconMessageType.PermissionRequest) {
        this.title = 'beacon-request.title.permission-request'
        await this.permissionRequestSubstrateV3(this.requestSubstrateV3 as BeaconMessageWrapper<SubstratePermissionRequest>)
      }

      if (
        this.requestSubstrateV3.message.type === BeaconMessageType.BlockchainRequest &&
        this.requestSubstrateV3.message.blockchainData.type === SubstrateMessageType.sign_payload_request
      ) {
        this.title = 'beacon-request.title.sign-payload-request'

        await this.signRequestSubstrateV3(this.requestSubstrateV3 as BeaconMessageWrapper<SubstrateSignPayloadRequest>)
      }
    } else {
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

  public async getNetworkFromRequestAcurast(
    requestSubstrateV3: BeaconMessageWrapper<
      SubstratePermissionRequest | SubstratePermissionResponse | SubstrateSignPayloadRequest | SubstrateTransferRequest | undefined
    >
  ): Promise<ProtocolNetwork | undefined> {
    if (!requestSubstrateV3) {
      return undefined
    }

    const protocol: ICoinProtocol = await this.beaconService.getAcurastProtocolNetwork()

    return protocol.options.network
  }

  public async cancel(): Promise<void> {
    if (this.requestSubstrateV3) {
      await this.beaconService.sendAbortedError(this.requestSubstrateV3.message.blockchainData as any)
      await this.dismiss()
    } else {
      await this.beaconService.sendAbortedError(this.request)
      await this.dismiss()
    }
  }

  public async dismiss(): Promise<boolean | void> {
    return this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async done(): Promise<void> {
    if (this.responseHandler) {
      await this.responseHandler()
    }
    await this.dismiss()
  }

  private async displayErrorPage(error: Error & { data?: unknown }): Promise<void> {
    await this.beaconService.displayErrorPage(error)

    setTimeout(async () => {
      await this.dismiss() // TODO: This causes flickering because it's "behind" the error modal.
    }, 100)
  }

  private async permissionRequest(request: PermissionRequestOutput): Promise<void> {
    if (this.selectableWallets.length > 0) {
      this.selectedWallet = this.selectableWallets[0]
    }
    if (!this.selectedWallet) {
      await this.beaconService.sendAccountNotFound(request)
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
      const scopes: PermissionScope[] = this.inputs.filter((input) => input.checked).map((input) => input.value)

      // The public key is in 'hex' format, convert it to "edpk" format
      const rawPublicKey = Buffer.from(this.selectedWallet.publicKey, 'hex')
      const edpkPrefix = Buffer.from(new Uint8Array([13, 15, 37, 217]))
      const edpkPublicKey = bs58check.encode(Buffer.concat([edpkPrefix, rawPublicKey]))

      const response: PermissionResponseInput = {
        id: request.id,
        type: BeaconMessageType.PermissionResponse,
        publicKey: edpkPublicKey,
        network: request.network,
        scopes,
        walletType: 'implicit'
      }

      await this.beaconService.respond(response, request)
    }
  }

  private async permissionRequestSubstrateV3(request: BeaconMessageWrapper<SubstratePermissionRequest>): Promise<void> {
    if (this.selectableWallets.length > 0) {
      this.selectedWallet = this.selectableWallets[0]
    }
    if (!this.selectedWallet) {
      // await this.beaconService.sendAccountNotFound(request)
      return
    }

    this.responseHandler = async (): Promise<void> => {
      const { appMetadata, scopes } = request.message.blockchainData
      const { id: accountId } = request
      const { blockchainIdentifier } = request.message

      type OmitBeaconMessageWrapper = Omit<BeaconMessageWrapper<SubstratePermissionResponse>, 'version' | 'senderId'>

      const response: OmitBeaconMessageWrapper = {
        id: accountId,
        message: {
          blockchainIdentifier,
          type: BeaconMessageType.PermissionResponse,
          blockchainData: {
            appMetadata,
            scopes,
            accounts: [
              {
                accountId,
                publicKey: this.selectedWallet.publicKey,
                address: this.selectedWallet.addresses[0],
                acurast_signatureType: 'sr25519'
              } as any
            ]
          }
        }
      }

      await this.beaconService.respond(response as any, request.message.blockchainData as any)
    }
  }

  public async changeAccount(): Promise<void> {
    return new Promise(async () => {
      if (this.selectableWallets.length === 1) {
        return
      }
      const alert = await this.alertController.create({
        header: this.translateService.instant('beacon-request.select-account.alert'),
        inputs: this.selectableWallets.map((wallet) => ({
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
            handler: (wallet) => {
              this.selectedWallet = wallet
            }
          }
        ]
      })

      await alert.present()
    })
  }

  private async signRequest(request: SignPayloadRequestOutput): Promise<void> {
    const tezosProtocol: ICoinProtocolAdapter<TezosProtocol> = await createV0TezosProtocol()
    const selectedWallet: AirGapMarketWallet = this.selectableWallets.find(
      (wallet: AirGapMarketWallet) =>
        wallet.protocol.identifier === MainProtocolSymbols.XTZ && wallet.receivingPublicAddress === request.sourceAddress
    )

    if (!selectedWallet) {
      await this.beaconService.sendAccountNotFound(request)
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

    const generatedId = generateId(8)
    await this.beaconService.addVaultRequest(request, tezosProtocol)

    const clonedRequest = { ...request }
    clonedRequest.id = new BigNumber(generatedId).toString() // TODO: Remove?

    this.responseHandler = async () => {
      this.accountService.startInteraction(selectedWallet, clonedRequest, IACMessageType.MessageSignRequest, undefined, false, generatedId)
    }
  }

  private async signRequestSubstrateV3(request: BeaconMessageWrapper<SubstrateSignPayloadRequest>): Promise<void> {
    const acurastProtocol: ICoinProtocolAdapter<AcurastProtocol> = await createV0AcurastProtocol()

    const selectedWallet: AirGapMarketWallet = this.selectableWallets.find(
      (wallet: AirGapMarketWallet) => wallet.protocol.identifier === MainProtocolSymbols.ACURAST
    )

    if (!selectedWallet) {
      // await this.beaconService.sendAccountNotFound(request)
      return
    }

    const payload = request.message.blockchainData.payload as {
      type: 'raw'
      isMutable: boolean
      dataType: 'bytes' | 'payload'
      data: string
    }

    const data = payload.data

    const requestMessage = {
      type: BeaconMessageType.SignPayloadRequest,
      signingType: SigningType.RAW,
      payload: data,
      sourceAddress: selectedWallet.receivingPublicAddress
    } as SignPayloadRequestOutput

    const generatedId = generateId(8)

    await this.beaconService.addVaultRequest(request, acurastProtocol, true)

    const clonedRequest = { ...requestMessage }

    clonedRequest.id = new BigNumber(generatedId).toString()

    this.responseHandler = async () => {
      this.accountService.startInteraction(selectedWallet, clonedRequest, IACMessageType.MessageSignRequest, undefined, false, generatedId)
    }
  }

  private async operationRequest(request: OperationRequestOutput): Promise<void> {
    let tezosProtocol: ICoinProtocolAdapter<TezosProtocol> = await createV0TezosProtocol()

    const selectedWallet: AirGapMarketWallet = this.selectableWallets.find(
      (wallet: AirGapMarketWallet) =>
        wallet.protocol.identifier === MainProtocolSymbols.XTZ && wallet.receivingPublicAddress === request.sourceAddress
    )

    if (!selectedWallet) {
      await this.beaconService.sendAccountNotFound(request)
      return
    }

    if (request.network.type !== BeaconNetworkType.MAINNET) {
      tezosProtocol = await this.beaconService.getProtocolBasedOnBeaconNetwork(request.network)
    }

    try {
      this.wrappedOperation = await tezosProtocol.protocolV1.prepareOperations(
        this.getV1PublicKey(selectedWallet.publicKey),
        request.operationDetails as any,
        false
      ) // don't override parameters
    } catch (error) {
      await this.dismiss()
      this.beaconService.sendInvalidTransaction(request, error)
      return
    }

    const forgedTransaction: string = await tezosProtocol.protocolV1.forgeOperation(this.wrappedOperation)
    const transaction: TezosTransactionSignRequest['transaction'] = { binaryTransaction: forgedTransaction }

    const generatedId = generateId(8)
    await this.beaconService.addVaultRequest(request, tezosProtocol)

    this.transactions = await tezosProtocol.convertTransactionDetailsV1ToV0(
      await tezosProtocol.protocolV1.getDetailsFromWrappedOperation({
        branch: '',
        contents: this.wrappedOperation.contents
      })
    )

    this.responseHandler = async () => {
      const airGapTxs = await tezosProtocol.getTransactionDetails({ publicKey: selectedWallet.publicKey, transaction })

      this.accountService.startInteraction(
        selectedWallet,
        transaction,
        IACMessageType.TransactionSignRequest,
        airGapTxs,
        false,
        generatedId
      )
    }
  }
  public async updateWrappedOperation(wrappedOperation: TezosWrappedOperation) {
    this.request = { ...this.request, operationDetails: wrappedOperation.contents } as OperationRequestOutput
    await this.operationRequest(this.request)
    const toast = await this.toastController.create({
      message: `Updated Operation Details`,
      duration: 2000,
      position: 'bottom'
    })
    toast.present()
  }

  private async broadcastRequest(request: BroadcastRequestOutput): Promise<void> {
    let tezosProtocol: ICoinProtocolAdapter<TezosProtocol> = await createV0TezosProtocol()
    const signedTx: string = request.signedTransaction

    if (request.network.type !== BeaconNetworkType.MAINNET) {
      tezosProtocol = await this.beaconService.getProtocolBasedOnBeaconNetwork(request.network)
    }

    const generatedId = generateId(8)
    await this.beaconService.addVaultRequest(request, tezosProtocol)

    this.transactions = await tezosProtocol.getTransactionDetailsFromSigned({
      accountIdentifier: '',
      transaction: signedTx
    })

    const messageDefinitionObject: IACMessageDefinitionObjectV3 = {
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

  public async setWallet(wallet: AirGapMarketWallet) {
    this.selectedWallet = wallet
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }

  private getV1PublicKey(publicKey: string): PublicKey {
    return newPublicKey(publicKey, isHex(publicKey) ? 'hex' : 'encoded')
  }
}
