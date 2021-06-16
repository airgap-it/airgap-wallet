import { BeaconMessageType, BeaconRequestOutputMessage, SigningType } from '@airgap/beacon-sdk'
import {
  AirGapMarketWallet,
  EthereumProtocol,
  EthereumProtocolOptions,
  generateId,
  IACMessageType,
  IAirGapTransaction,
  MainProtocolSymbols
} from '@airgap/coinlib-core'
import { RawEthereumTransaction } from '@airgap/coinlib-core/serializer/types'
import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { AlertController, ModalController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import WalletConnect from '@walletconnect/client'
import BigNumber from 'bignumber.js'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { BeaconService } from 'src/app/services/beacon/beacon.service'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

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
  public transactions: IAirGapTransaction[] | undefined
  public selectableWallets: AirGapMarketWallet[] = []
  public selectedWallet: AirGapMarketWallet
  public readonly request: JSONRPC
  public readonly requestMethod: typeof Methods = Methods
  private readonly connector: WalletConnect | undefined

  public beaconRequest: any
  private responseHandler: (() => Promise<void>) | undefined

  constructor(
    private readonly modalController: ModalController,
    private readonly accountService: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router,
    private readonly alertCtrl: AlertController,
    private readonly beaconService: BeaconService,
    private readonly translateService: TranslateService
  ) {}

  public get address(): string {
    if (this.selectedWallet !== undefined) {
      return this.selectedWallet.receivingPublicAddress
    }
    return ''
  }

  public async ngOnInit(): Promise<void> {
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

  public async done(): Promise<void> {
    if (this.responseHandler) {
      await this.responseHandler()
    }
    await this.dismissModal()
  }

  private async signRequest(request: JSONRPC<string>) {
    const message = request.params[0]
    const address = request.params[1]
    console.log(address)
    const selectedWallet: AirGapMarketWallet = this.accountService
      .getWalletList()
      .find((wallet: AirGapMarketWallet) => wallet.protocol.identifier === MainProtocolSymbols.ETH) // TODO: Add wallet selection

    if (!selectedWallet) {
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

    this.beaconService.addVaultRequest(generatedId, this.beaconRequest, protocol)
    this.responseHandler = async () => {
      const info = {
        wallet: selectedWallet,
        data: this.beaconRequest,
        generatedId: generatedId,
        type: IACMessageType.MessageSignRequest
      }

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private async permissionRequest(request: JSONRPC<SessionRequest>): Promise<void> {
    this.description = request.params[0].peerMeta.description ? request.params[0].peerMeta.description : ''
    this.url = request.params[0].peerMeta.url ? request.params[0].peerMeta.url : ''
    this.icon = request.params[0].peerMeta.icons ? request.params[0].peerMeta.icons[0] : ''
    this.requesterName = request.params[0].peerMeta.name ? request.params[0].peerMeta.name : ''
    this.selectableWallets = this.accountService
      .getWalletList()
      .filter((wallet: AirGapMarketWallet) => wallet.protocol.identifier === MainProtocolSymbols.ETH)
    if (this.selectableWallets.length > 0) {
      this.selectedWallet = this.selectableWallets[0]
    }
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
      }
    }
  }

  private async operationRequest(request: JSONRPC<EthTx>): Promise<void> {
    const ethereumProtocol: EthereumProtocol = new EthereumProtocol()

    const selectedWallet: AirGapMarketWallet = this.accountService
      .getWalletList()
      .find((wallet: AirGapMarketWallet) => wallet.protocol.identifier === MainProtocolSymbols.ETH) // TODO: Add wallet selection

    if (!selectedWallet) {
      throw new Error('no wallet found!')
    }

    const options: EthereumProtocolOptions = new EthereumProtocolOptions()
    const gasPrice = await options.nodeClient.getGasPrice()
    const txCount = await options.nodeClient.fetchTransactionCount(selectedWallet.receivingPublicAddress)
    const protocol = new EthereumProtocol()
    const eth = request.params[0]

    const transaction: RawEthereumTransaction = {
      nonce: eth.nonce ? eth.nonce : `0x${new BigNumber(txCount).toString(16)}`,
      gasPrice: eth.gasPrice ? eth.gasPrice : `0x${new BigNumber(gasPrice).toString(16)}`,
      gasLimit: `0x${(300000).toString(16)}`,
      to: eth.to,
      value: eth.value,
      chainId: 1,
      data: eth.data
    }

    const walletConnectRequest = {
      transaction: transaction,
      id: request.id
    }

    const generatedId = await generateId(8)

    this.beaconService.addVaultRequest(generatedId, walletConnectRequest, protocol)
    this.transactions = await ethereumProtocol.getTransactionDetails({
      publicKey: selectedWallet.publicKey,
      transaction
    })

    this.responseHandler = async () => {
      const info = {
        wallet: selectedWallet,
        airGapTxs: await ethereumProtocol.getTransactionDetails({ publicKey: selectedWallet.publicKey, transaction }),
        data: transaction,
        type: IACMessageType.TransactionSignRequest
      }

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch((err) => console.error(err))
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
}
