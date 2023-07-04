import { assertNever, ICoinProtocolAdapter } from '@airgap/angular-core'
import { BeaconMessageType, BeaconRequestOutputMessage, SigningType } from '@airgap/beacon-sdk'
import { AirGapMarketWallet, AirGapWalletStatus, IAirGapTransaction, ProtocolSymbols } from '@airgap/coinlib-core'
import { isHex } from '@airgap/coinlib-core/utils/hex'
import { isOnlineProtocol, isSubProtocol, ProtocolSymbol, supportsWalletConnect, UnsignedTransaction } from '@airgap/module-kit'
import { generateId, IACMessageType, TransactionSignRequest } from '@airgap/serializer'
import { Component, OnInit } from '@angular/core'
import { AlertController, ModalController, ToastController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'

import { Subscription } from 'rxjs'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { BeaconService } from 'src/app/services/beacon/beacon.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { stripV1Wallet } from 'src/app/utils/utils'
import { WalletconnectV1Handler, WalletconnectV1HandlerContext } from './handler/walletconnect-v1.handler'
import { WalletconnectV2Handler, WalletconnectV2HandlerContext } from './handler/walletconnect-v2.handler'
import {
  EthMethods,
  EthTx,
  Namespace,
  SwitchEthereumChain,
  WalletconnectSignRequest,
  WalletconnectMessage,
  WalletconnectPermissionRequest,
  WalletconnectSwitchAccountRequest
} from './walletconnect.types'

export interface WalletconnectV1Context extends WalletconnectV1HandlerContext {
  version: 1
}

export interface WalletconnectV2Context extends WalletconnectV2HandlerContext {
  version: 2
}

export type WalletconnectContext = WalletconnectV1Context | WalletconnectV2Context

enum Mode {
  PERMISSION_REQUEST = 'permissionRequest',
  SIGN_TRANSACTION = 'signTransaction',
  SIGN_MESSAGE = 'signMessage',
  SWITCH_ACCOUNT = 'switchAccount'
}

@Component({
  selector: 'app-walletconnect',
  templateUrl: './walletconnect.page.html',
  styleUrls: ['./walletconnect.page.scss']
})
export class WalletconnectPage implements OnInit {
  public context: WalletconnectContext
  public message: WalletconnectMessage

  private readonly handlers = {
    v1: new WalletconnectV1Handler(),
    v2: new WalletconnectV2Handler()
  }

  public title: string = ''
  public requesterName: string = ''
  public description: string = ''
  public url: string = ''
  public icon: string = ''
  public beaconRequest: any

  public mode: Mode | undefined
  public readonly Mode: typeof Mode = Mode

  public selectableWallets: AirGapMarketWallet[] = []
  public airGapTransactions: IAirGapTransaction[] | undefined
  public rawTransaction: TransactionSignRequest['transaction']

  private subscription: Subscription
  private selectedWallet: AirGapMarketWallet | undefined
  public targetProtocolSymbol: ProtocolSymbol | ProtocolSymbols[] | undefined
  private responseHandler: (() => Promise<void>) | undefined

  public constructor(
    private readonly modalController: ModalController,
    private readonly accountService: AccountProvider,
    private readonly alertCtrl: AlertController,
    private readonly beaconService: BeaconService,
    private readonly translateService: TranslateService,
    private readonly toastController: ToastController
  ) {}

  public get address(): string {
    if (this.selectedWallet !== undefined) {
      return this.selectedWallet.receivingPublicAddress
    }
    return ''
  }

  public get protocolIdentifier(): ProtocolSymbols | undefined {
    if (this.selectedWallet !== undefined) {
      return this.selectedWallet.protocol.identifier
    }

    return undefined
  }

  public async ngOnInit(): Promise<void> {
    this.subscription = this.accountService.allWallets$.asObservable().subscribe((wallets: AirGapMarketWallet[]) => {
      this.selectableWallets = wallets.filter(
        (wallet: AirGapMarketWallet) =>
          wallet.status === AirGapWalletStatus.ACTIVE &&
          wallet.protocol instanceof ICoinProtocolAdapter &&
          !isSubProtocol(wallet.protocol.protocolV1) &&
          isOnlineProtocol(wallet.protocol.protocolV1) &&
          supportsWalletConnect(wallet.protocol.protocolV1)
      )
    })

    if (!this.context) {
      return
    }

    switch (this.context.version) {
      case 1:
        this.message = await this.handlers['v1'].readMessage(this.context)
        break
      case 2:
        this.message = await this.handlers['v2'].readMessage(this.context)
        break
      default:
        assertNever('context', this.context)
    }

    if (!this.message) {
      return
    }

    if (this.message.type === 'permissionRequest') {
      this.mode = Mode.PERMISSION_REQUEST
      this.title = this.translateService.instant('walletconnect.connection_request')
      await this.permissionRequest(this.message)
    }

    if (
      this.message.type === 'signRequest' &&
      this.message.namespace === Namespace.ETH &&
      this.message.request.method === EthMethods.ETH_SENDTRANSACTION
    ) {
      this.mode = Mode.SIGN_TRANSACTION
      this.title = this.translateService.instant('walletconnect.new_transaction')
      await this.operationRequest(this.message as WalletconnectSignRequest<EthTx>)
    }

    if (
      this.message.type === 'signRequest' &&
      this.message.namespace === Namespace.ETH &&
      this.message.request.method === EthMethods.PERSONAL_SIGN_REQUEST
    ) {
      this.mode = Mode.SIGN_MESSAGE
      this.title = this.translateService.instant('walletconnect.sign_request')
      await this.signRequest(this.message as WalletconnectSignRequest<string>)
    }

    if (
      this.message.type === 'switchAccountRequest' &&
      this.message.namespace === Namespace.ETH &&
      this.message.request.method === EthMethods.WALLET_SWITCH_ETHEREUM_CHAIN
    ) {
      this.mode = Mode.SWITCH_ACCOUNT
      this.title = this.translateService.instant('walletconnect.switch_ethereum_chain')
      await this.switchEthereumChain(this.message as WalletconnectSwitchAccountRequest<SwitchEthereumChain>)
    }

    if (this.message.type === 'unsupported') {
      if (this.message.namespace === Namespace.ETH && this.message.method === EthMethods.ETH_SIGN_TYPED_DATA) {
        this.mode = Mode.SIGN_MESSAGE
        this.title = this.translateService.instant('walletconnect.sign_typed_data')
      }
      await this.notSupportedAlert()
    }
  }

  public async updateRawTransaction(rawTransaction: TransactionSignRequest['transaction']) {
    this.rawTransaction = { ...this.rawTransaction, gasPrice: rawTransaction.gasPrice, gasLimit: rawTransaction.gasLimit }

    const protocol = this.selectedWallet.protocol
    this.airGapTransactions = await protocol.getTransactionDetails({
      publicKey: this.selectedWallet.publicKey,
      transaction: this.rawTransaction
    })

    this.responseHandler = async () => {
      this.accountService.startInteraction(
        this.selectedWallet,
        this.rawTransaction,
        IACMessageType.TransactionSignRequest,
        this.airGapTransactions
      )
    }
    const toast = await this.toastController.create({
      message: `Updated Transaction Details`,
      duration: 2000,
      position: 'bottom'
    })

    toast.present()
  }

  public async done(): Promise<void> {
    if (this.responseHandler) {
      await this.responseHandler()
    }
    await this.dismissModal()
  }

  private async signRequest(request: WalletconnectSignRequest<string>) {
    const message = request.request.params[0]
    const address = request.request.params[1]

    const selectableWallets = await this.filterWallets(this.selectableWallets, request.chain, address)
    const wallet = selectableWallets[0]
    await this.setWallet(wallet)

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }
    const requestId = `${request.version}:${request.request.id}`
    const generatedId = generateId(8)
    const protocol = this.selectedWallet.protocol

    this.beaconRequest = {
      type: BeaconMessageType.SignPayloadRequest,
      signingType: 'raw' as SigningType,
      payload: message,
      sourceAddress: address,
      id: requestId,
      senderId: '',
      appMetadata: { senderId: '', name: '' },
      version: '2'
    } as BeaconRequestOutputMessage

    this.beaconService.addVaultRequest(this.beaconRequest, protocol)
    this.responseHandler = async () => {
      this.accountService.startInteraction(
        this.selectedWallet,
        this.beaconRequest,
        IACMessageType.MessageSignRequest,
        undefined,
        false,
        generatedId
      )
    }
  }

  private async permissionRequest(request: WalletconnectPermissionRequest): Promise<void> {
    this.description = request.dAppMetadata.description ?? ''
    this.url = request.dAppMetadata.url ?? ''
    this.icon = request.dAppMetadata.icon ?? ''
    this.requesterName = request.dAppMetadata.name ?? ''

    const selectableWallets = await this.filterWallets(this.selectableWallets, request.chains)
    const wallet = selectableWallets[0]
    await Promise.all([
      this.setTargetProtocolSymbol(request.canOverrideChain ? this.selectableWallets : selectableWallets),
      this.setWallet(wallet)
    ])

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }

    this.responseHandler = async (): Promise<void> => {
      const protocolChain = this.selectedWallet ? await this.getWalletConnectChain(this.selectedWallet) : undefined
      const chains = protocolChain ? [protocolChain] : request.chains ?? [':']
      const accounts = chains.map((chain: string) => `${chain}:${this.address}`)

      if (request.approve) {
        request.approve(accounts)
      }
    }
  }

  private async operationRequest(request: WalletconnectSignRequest<EthTx>): Promise<void> {
    const eth = request.request.params[0]
    const selectableWallets = await this.filterWallets(this.selectableWallets, request.chain, eth.from)
    const wallet = selectableWallets[0]
    await this.setWallet(wallet)

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }

    this.rawTransaction = await this.prepareWalletConnectTransaction(this.selectedWallet, eth)

    const walletConnectRequest = {
      transaction: this.rawTransaction,
      id: `${request.version}:${request.request.id}`
    }

    const protocol = this.selectedWallet.protocol

    this.beaconService.addVaultRequest(walletConnectRequest, protocol)

    this.airGapTransactions = await protocol.getTransactionDetails({
      publicKey: this.selectedWallet.publicKey,
      transaction: this.rawTransaction
    })

    this.responseHandler = async () => {
      this.accountService.startInteraction(
        this.selectedWallet,
        this.rawTransaction,
        IACMessageType.TransactionSignRequest,
        this.airGapTransactions
      )
    }
  }

  private async switchEthereumChain(request: WalletconnectSwitchAccountRequest<SwitchEthereumChain>): Promise<void> {
    const address = request.account
    this.description = request.dAppMetadata.description ?? ''
    this.url = request.dAppMetadata.url ?? ''
    this.icon = request.dAppMetadata.icon ?? ''
    this.requesterName = request.dAppMetadata.name ?? ''
    const chainId = parseInt(request.request.params[0].chainId, isHex(request.request.params[0].chainId) ? 16 : 10)

    const selectableWallets = await this.filterWallets(this.selectableWallets, `${Namespace.ETH}:${chainId}`, address)
    const wallet = selectableWallets[0]
    await Promise.all([this.setTargetProtocolSymbol([]), this.setWallet(wallet)])

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }

    this.responseHandler = async (): Promise<void> => {
      if (request.respond) {
        await request.respond(chainId)
      }
    }
  }

  public async dismissModal(): Promise<void> {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async dismiss(): Promise<void> {
    this.dismissModal()
    if (this.message.type === 'permissionRequest' && this.message.reject) {
      this.message.reject()
    }
    if (this.message.type === 'signRequest' || (this.message.type === 'switchAccountRequest' && this.message.cancel)) {
      this.message.cancel()
    }
  }

  private async notSupportedAlert() {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translateService.instant('walletconnect.alert.title'),
      message: this.translateService.instant('walletconnect.alert.message'),
      backdropDismiss: false,
      buttons: [
        {
          text: 'ok',
          role: 'cancel',
          handler: () => {
            this.dismiss()
          }
        }
      ]
    })
    alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }

  public async setWallet(wallet: AirGapMarketWallet) {
    this.selectedWallet = wallet
  }

  public async setTargetProtocolSymbol(wallets: AirGapMarketWallet[]) {
    const protocolIdentifiers: ProtocolSymbols[] = await Promise.all(
      wallets.map((wallet: AirGapMarketWallet) => wallet.protocol.getIdentifier())
    )
    this.targetProtocolSymbol = protocolIdentifiers
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }

  private async prepareWalletConnectTransaction(
    wallet: AirGapMarketWallet,
    request: EthTx
  ): Promise<TransactionSignRequest['transaction']> {
    const { adapter, publicKey } = stripV1Wallet(wallet)

    if (!supportsWalletConnect(adapter.protocolV1)) {
      throw new Error(`Protocol ${adapter.identifier} doesn't support WalletConnect.`)
    }

    const v1Transaction: UnsignedTransaction = await adapter.protocolV1.prepareWalletConnectTransactionWithPublicKey(publicKey, request)
    const v0Transaction: TransactionSignRequest = await adapter.convertUnsignedTransactionV1ToV0(v1Transaction, wallet.publicKey)

    return v0Transaction.transaction
  }

  private async getWalletConnectChain(wallet: AirGapMarketWallet): Promise<string | undefined> {
    try {
      const { adapter } = stripV1Wallet(wallet)
      if (!supportsWalletConnect(adapter.protocolV1)) {
        return undefined
      }

      return adapter.protocolV1.getWalletConnectChain()
    } catch (error) {
      console.warn(error)
      return undefined
    }
  }

  private async filterWallets(
    wallets: AirGapMarketWallet[],
    chainOrChains: string | string[],
    address?: string
  ): Promise<AirGapMarketWallet[]> {
    const chains: Set<string> = new Set(typeof chainOrChains === 'string' ? [chainOrChains] : chainOrChains)
    if (chains.size === 0 && address === undefined) {
      return wallets
    }

    const selectableWallets = await Promise.all(
      wallets.map(async (wallet) => {
        const isAddressMatching = address ? wallet.receivingPublicAddress.toLowerCase() === address.toLowerCase() : true
        if (chains.size === 0) {
          return isAddressMatching ? wallet : undefined
        }

        const protocolChain = await this.getWalletConnectChain(wallet)
        return isAddressMatching && protocolChain !== undefined && chains.has(protocolChain) ? wallet : undefined
      })
    )

    return selectableWallets.filter((wallet) => wallet !== undefined)
  }
}
