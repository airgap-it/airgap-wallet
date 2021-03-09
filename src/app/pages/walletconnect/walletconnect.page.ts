import { SerializerService } from '@airgap/angular-core'
import {
  AirGapMarketWallet,
  EthereumProtocol,
  generateId,
  IACMessageType,
  IAirGapTransaction,
  MainProtocolSymbols
} from '@airgap/coinlib-core'
import { RawEthereumTransaction } from '@airgap/coinlib-core/serializer/types'
import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { ModalController } from '@ionic/angular'
import WalletConnect from '@walletconnect/client'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

enum Methods {
  SESSION_REQUEST = 'session_request',
  ETH_SENDTRANSACTION = 'eth_sendTransaction'
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
  public name: string = ''
  public description: string = ''
  public url: string = ''
  public icon: string = ''
  public transactions: IAirGapTransaction[] | undefined

  public readonly request: JSONRPC
  public readonly requestMethod: typeof Methods = Methods

  private readonly connector: WalletConnect | undefined

  private responseHandler: (() => Promise<void>) | undefined

  constructor(
    private readonly modalController: ModalController,
    private readonly accountService: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router,
    private readonly serializerService: SerializerService
  ) {}

  public async ngOnInit(): Promise<void> {
    if (this.request && this.request.method === Methods.SESSION_REQUEST) {
      this.title = 'WalletConnect - Connection Request'
      await this.permissionRequest(this.request as JSONRPC<SessionRequest>)
    }

    if (this.request && this.request.method === Methods.ETH_SENDTRANSACTION) {
      this.title = 'WalletConnect - New Transaction'
      await this.operationRequest(this.request as JSONRPC<EthTx>)
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

  private async permissionRequest(request: JSONRPC<SessionRequest>): Promise<void> {
    this.name = request.params[0].peerMeta.name
    this.description = request.params[0].peerMeta.description
    this.url = request.params[0].peerMeta.url
    this.icon = request.params[0].peerMeta.icons ? request.params[0].peerMeta.icons[0] : ''

    const selectedWallet: AirGapMarketWallet = this.accountService
      .getWalletList()
      .find((wallet: AirGapMarketWallet) => wallet.protocol.identifier === MainProtocolSymbols.ETH) // TODO: Add wallet selection
    if (!selectedWallet) {
      throw new Error('no wallet found!')
    }
    const address: string = await selectedWallet.protocol.getAddressFromPublicKey(selectedWallet.publicKey)

    this.responseHandler = async (): Promise<void> => {
      // Approve Session
      this.connector.approveSession({
        accounts: [address],
        chainId: 1
      })
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

    const eth = request.params[0]

    const transaction: RawEthereumTransaction | undefined = {
      nonce: eth.nonce,
      gasPrice: eth.gasPrice,
      gasLimit: (300000).toString(16),
      to: eth.to,
      value: eth.value,
      chainId: 1,
      data: eth.data
    }

    this.transactions = await ethereumProtocol.getTransactionDetails({
      publicKey: selectedWallet.publicKey,
      transaction
    })

    this.responseHandler = async () => {
      console.log('transaction', transaction)

      const serializedChunks: string[] = await this.serializerService.serialize([
        {
          id: await generateId(10),
          protocol: selectedWallet.protocol.identifier,
          type: IACMessageType.TransactionSignRequest,
          payload: {
            publicKey: selectedWallet.publicKey,
            transaction,
            callback: 'airgap-wallet://?d='
          } as any
        }
      ])
      const info = {
        wallet: selectedWallet,
        airGapTxs: await ethereumProtocol.getTransactionDetails({ publicKey: selectedWallet.publicKey, transaction }),
        data: serializedChunks
      }

      // if (payload.method === 'eth_sendTransaction') {
      //   console.log('GOT SEND REQUEST', payload)
      //   // Approve Call Request
      //   this.connector.approveRequest({
      //     id: payload.id,
      //     result: '0x41791102999c339c844880b23950704cc43aa840f3739e365323cda4dfa89e7a'
      //   })
      // } else {
      //   // Reject Call Request
      //   this.connector.rejectRequest({
      //     id: payload.id, // required
      //     error: {
      //       code: 1, // optional
      //       message: 'Method not supported' // optional
      //     }
      //   })
      // }

      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }
}
