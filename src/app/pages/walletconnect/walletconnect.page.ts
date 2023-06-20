import { getBytesFormatV1FromV0, ICoinProtocolAdapter } from '@airgap/angular-core'
import { BeaconMessageType, BeaconRequestOutputMessage, SigningType } from '@airgap/beacon-sdk'
import { AirGapMarketWallet, AirGapWalletStatus, IAirGapTransaction, ProtocolSymbols } from '@airgap/coinlib-core'
import { isHex } from '@airgap/coinlib-core/utils/hex'
import {
  isBip32Protocol,
  isOnlineProtocol,
  isSubProtocol,
  newExtendedPublicKey,
  newPublicKey,
  ProtocolSymbol,
  supportsWalletConnect,
  UnsignedTransaction
} from '@airgap/module-kit'
import { generateId, IACMessageType, TransactionSignRequest } from '@airgap/serializer'
import { Component, OnInit } from '@angular/core'
import { AlertController, ModalController, ToastController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import WalletConnect from '@walletconnect/client'
import BigNumber from 'bignumber.js'
import { Subscription } from 'rxjs'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { BeaconService } from 'src/app/services/beacon/beacon.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { saveWalletConnectSession } from 'src/app/services/walletconnect/helpers'

enum Methods {
  SESSION_REQUEST = 'session_request',
  ETH_SENDTRANSACTION = 'eth_sendTransaction',
  PERSONAL_SIGN_REQUEST = 'personal_sign',
  ETH_SIGN_TYPED_DATA = 'eth_signTypedData',
  WALLET_SWITCH_ETHEREUM_CHAIN = 'wallet_switchEthereumChain'
}

interface JSONRPC<T = unknown> {
  id: number
  jsonrpc: string
  method: Methods
  params: T[]
}

interface EthTx {
  from: string
  to: string
  data: string
  gasLimit: string
  gasPrice: string
  value: string
  nonce: string
}

interface SessionRequest {
  chainId?: number
  peerId: string
  peerMeta: {
    name: string
    description: string
    icons: string[]
    url: string
  }
}

interface SwitchEthereumChain {
  chainId: string
}

@Component({
  selector: 'app-walletconnect',
  templateUrl: './walletconnect.page.html',
  styleUrls: ['./walletconnect.page.scss']
})
export class WalletconnectPage implements OnInit {
  public title: string = ''
  public requesterName: string = ''
  public description: string = ''
  public url: string = ''
  public icon: string = ''
  public beaconRequest: any
  public request: JSONRPC
  public selectableWallets: AirGapMarketWallet[] = []
  public airGapTransactions: IAirGapTransaction[] | undefined
  public rawTransaction: TransactionSignRequest['transaction']
  public readonly requestMethod: typeof Methods = Methods

  private subscription: Subscription
  private selectedWallet: AirGapMarketWallet | undefined
  public targetProtocolSymbol: ProtocolSymbol | ProtocolSymbols[] | undefined
  private responseHandler: (() => Promise<void>) | undefined
  private readonly connector: WalletConnect | undefined

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
    if (this.request && this.request.method === Methods.SESSION_REQUEST) {
      this.title = this.translateService.instant('walletconnect.connection_request')
      await this.permissionRequest(this.request as JSONRPC<SessionRequest>)
    }

    if (this.request && this.request.method === Methods.ETH_SENDTRANSACTION) {
      this.title = this.translateService.instant('walletconnect.new_transaction')
      await this.operationRequest(this.request as JSONRPC<EthTx>)
    }

    if (this.request && this.request.method === Methods.PERSONAL_SIGN_REQUEST) {
      this.title = this.translateService.instant('walletconnect.sign_request')
      await this.signRequest(this.request as JSONRPC<string>)
    }

    if (this.request && this.request.method === Methods.WALLET_SWITCH_ETHEREUM_CHAIN) {
      this.title = this.translateService.instant('walletconnect.switch_ethereum_chain')
      await this.switchEthereumChain(this.request as JSONRPC<SwitchEthereumChain>)
    }

    if (this.request && this.request.method === Methods.ETH_SIGN_TYPED_DATA) {
      this.title = this.translateService.instant('walletconnect.sign_typed_data')
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

  private async signRequest(request: JSONRPC<string>) {
    const message = request.params[0]
    const address = request.params[1]

    const selectableWallets = await this.filterWallets(this.selectableWallets, this.connector?.chainId, address)
    const wallet = selectableWallets[0]
    await this.setWallet(wallet)

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }
    const requestId = new BigNumber(request.id).toString()
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

  private async permissionRequest(request: JSONRPC<SessionRequest>): Promise<void> {
    this.description = request.params[0].peerMeta.description ? request.params[0].peerMeta.description : ''
    this.url = request.params[0].peerMeta.url ? request.params[0].peerMeta.url : ''
    this.icon = request.params[0].peerMeta.icons ? request.params[0].peerMeta.icons[0] : ''
    this.requesterName = request.params[0].peerMeta.name ? request.params[0].peerMeta.name : ''
    const chainId = request.params[0].chainId ?? 1

    const selectableWallets = await this.filterWallets(this.selectableWallets, chainId)
    const wallet = selectableWallets[0]
    await Promise.all([this.setTargetProtocolSymbol(this.selectableWallets), this.setWallet(wallet)])

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }

    this.responseHandler = async (): Promise<void> => {
      const protocolChainId = this.selectedWallet ? await this.getWalletConnectChainId(this.selectedWallet) : undefined
      // Approve Session
      const approveData = {
        chainId: protocolChainId ?? chainId,
        accounts: [this.address]
      }
      if (this.connector) {
        this.connector.approveSession(approveData)
        saveWalletConnectSession(this.connector.peerId, this.connector.session)
      }
    }
  }

  private async operationRequest(request: JSONRPC<EthTx>): Promise<void> {
    const eth = request.params[0]
    const selectableWallets = await this.filterWallets(this.selectableWallets, this.connector?.chainId, eth.from)
    const wallet = selectableWallets[0]
    await this.setWallet(wallet)

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }

    this.rawTransaction = await this.prepareWalletConnectTransaction(this.selectedWallet, eth)

    const walletConnectRequest = {
      transaction: this.rawTransaction,
      id: request.id
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

  private async switchEthereumChain(request: JSONRPC<SwitchEthereumChain>): Promise<void> {
    const address = this.connector.accounts[0]
    this.description = this.connector.peerMeta.description
    this.url = this.connector.peerMeta.url
    this.icon = this.connector.peerMeta.icons[0] ?? ''
    this.requesterName = this.connector.peerMeta.name
    const chainId = parseInt(request.params[0].chainId, isHex(request.params[0].chainId) ? 16 : 10)

    const selectableWallets = await this.filterWallets(this.selectableWallets, chainId, address)
    const wallet = selectableWallets[0]
    await Promise.all([this.setTargetProtocolSymbol([]), this.setWallet(wallet)])

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }

    this.responseHandler = async (): Promise<void> => {
      this.connector?.updateSession({
        chainId,
        accounts: this.connector.accounts
      })
      await saveWalletConnectSession(this.connector.peerId, this.connector.session)
    }
  }

  public async dismissModal(): Promise<void> {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async dismiss(): Promise<void> {
    this.dismissModal()
    this.rejectRequest(this.request.id)
  }

  public async rejectRequest(id: number) {
    this.connector.rejectRequest({
      id: id,
      error: {
        message: 'USER_REJECTION' // optional
      }
    })
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
    if (!(wallet.protocol instanceof ICoinProtocolAdapter)) {
      throw new Error('Unexpected protocol instance.')
    }

    const protocol: ICoinProtocolAdapter = wallet.protocol
    if (!(isOnlineProtocol(protocol.protocolV1) && supportsWalletConnect(protocol.protocolV1))) {
      throw new Error(`Protocol ${protocol.identifier} doesn't support WalletConnect.`)
    }
    if (wallet.isExtendedPublicKey && !isBip32Protocol(protocol.protocolV1)) {
      throw new Error(`Protocol ${protocol.identifier} doesn't support extended keys.`)
    }

    const createPublicKey = wallet.isExtendedPublicKey ? newExtendedPublicKey : newPublicKey
    const publicKey = createPublicKey(wallet.publicKey, getBytesFormatV1FromV0(wallet.publicKey))

    const v1Transaction: UnsignedTransaction = await protocol.protocolV1.prepareWalletConnectTransactionWithPublicKey(
      publicKey as any /* force the type as we've already checked if the protocol supports extended keys (isBip32Protocol) */,
      request
    )

    const v0Transaction: TransactionSignRequest = await protocol.convertUnsignedTransactionV1ToV0(v1Transaction, wallet.publicKey)

    return v0Transaction.transaction
  }

  private async getWalletConnectChainId(wallet: AirGapMarketWallet): Promise<number | undefined> {
    if (!(wallet.protocol instanceof ICoinProtocolAdapter)) {
      return undefined
    }

    const protocol: ICoinProtocolAdapter = wallet.protocol
    if (!(isOnlineProtocol(protocol.protocolV1) && supportsWalletConnect(protocol.protocolV1))) {
      return undefined
    }

    return protocol.protocolV1.getWalletConnectChainId()
  }

  private async filterWallets(wallets: AirGapMarketWallet[], chainId?: number, address?: string): Promise<AirGapMarketWallet[]> {
    if (chainId === undefined && address === undefined) {
      return wallets
    }

    const selectableWallets = await Promise.all(
      wallets.map(async (wallet) => {
        const isAddressMatching = address ? wallet.receivingPublicAddress.toLowerCase() === address.toLowerCase() : true
        if (chainId === undefined) {
          return isAddressMatching ? wallet : undefined
        }

        const protocolChainId = await this.getWalletConnectChainId(wallet)
        return isAddressMatching && protocolChainId !== undefined && protocolChainId === chainId ? wallet : undefined
      })
    )

    return selectableWallets.filter((wallet) => wallet !== undefined)
  }
}
