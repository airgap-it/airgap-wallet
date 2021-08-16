import { BeaconMessageType, BeaconRequestOutputMessage, SigningType } from '@airgap/beacon-sdk'
import {
  AirGapMarketWallet,
  AirGapWalletStatus,
  EthereumProtocol,
  EthereumProtocolOptions,
  generateId,
  IACMessageType,
  IAirGapTransaction,
  MainProtocolSymbols
} from '@airgap/coinlib-core'
import { RawEthereumTransaction } from '@airgap/coinlib-core/serializer/types'
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
  ETH_SIGN_TYPED_DATA = 'eth_signTypedData'
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
  peerId: string
  peerMeta: {
    name: string
    description: string
    icons: string[]
    url: string
  }
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
  public rawTransaction: RawEthereumTransaction
  public readonly requestMethod: typeof Methods = Methods

  private subscription: Subscription
  private selectedWallet: AirGapMarketWallet | undefined
  private responseHandler: (() => Promise<void>) | undefined
  private readonly connector: WalletConnect | undefined

  constructor(
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

  public async ngOnInit(): Promise<void> {
    this.subscription = this.accountService.allWallets$.asObservable().subscribe((wallets: AirGapMarketWallet[]) => {
      this.selectableWallets = wallets.filter(
        (wallet: AirGapMarketWallet) =>
          (wallet.protocol.identifier === MainProtocolSymbols.ETH || wallet.protocol.identifier === MainProtocolSymbols.RBTC) &&
          wallet.status === AirGapWalletStatus.ACTIVE
      )
      if (this.selectableWallets.length > 0) {
        this.selectedWallet = this.selectableWallets[0]
      }
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

    if (this.request && this.request.method === Methods.ETH_SIGN_TYPED_DATA) {
      this.title = this.translateService.instant('walletconnect.sign_typed_data')
      await this.notSupportedAlert()
    }
  }

  public async updateRawTransaction(rawTransaction: RawEthereumTransaction) {
    this.rawTransaction = { ...this.rawTransaction, gasPrice: rawTransaction.gasPrice, gasLimit: rawTransaction.gasLimit }

    const ethereumProtocol = new EthereumProtocol()
    this.airGapTransactions = await ethereumProtocol.getTransactionDetails({
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

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }
    const requestId = new BigNumber(request.id).toString()
    const generatedId = generateId(8)
    const protocol = new EthereumProtocol()

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

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }

    this.responseHandler = async (): Promise<void> => {
      // Approve Session
      const approveData = {
        chainId: 1,
        accounts: [this.address]
      }
      if (this.connector) {
        this.connector.approveSession(approveData)
        saveWalletConnectSession(this.connector.peerId, this.connector.session)
      }
    }
  }

  private async operationRequest(request: JSONRPC<EthTx>): Promise<void> {
    const ethereumProtocol: EthereumProtocol = new EthereumProtocol()

    if (!this.selectedWallet) {
      throw new Error('no wallet found!')
    }

    const options: EthereumProtocolOptions = new EthereumProtocolOptions()
    const gasPrice = await options.nodeClient.getGasPrice()
    const txCount = await options.nodeClient.fetchTransactionCount(this.selectedWallet.receivingPublicAddress)
    const protocol = new EthereumProtocol()
    const eth = request.params[0]

    this.rawTransaction = {
      nonce: eth.nonce ? eth.nonce : `0x${new BigNumber(txCount).toString(16)}`,
      gasPrice: eth.gasPrice ? eth.gasPrice : `0x${new BigNumber(gasPrice).toString(16)}`,
      gasLimit: `0x${(300000).toString(16)}`,
      to: eth.to,
      value: eth.value,
      chainId: 1,
      data: eth.data
    }

    const walletConnectRequest = {
      transaction: this.rawTransaction,
      id: request.id
    }

    this.beaconService.addVaultRequest(walletConnectRequest, protocol)

    this.airGapTransactions = await ethereumProtocol.getTransactionDetails({
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

  async setWallet(wallet: AirGapMarketWallet) {
    this.selectedWallet = wallet
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }
}
