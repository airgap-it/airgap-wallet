import WalletConnect from '@walletconnect/client'
import { saveWalletConnectV1Session } from 'src/app/services/walletconnect/helpers'
import {
  JSONRPC as _JSONRPC,
  EthMethods,
  WalletconnectMessage,
  Namespace,
  SessionRequest,
  EthTx,
  SwitchEthereumChain
} from '../walletconnect.types'

import { WalletconnectHandler } from './walletconnect.handler'

enum Methods {
  SESSION_REQUEST = 'session_request'
}

type JSONRPC<T = unknown> = _JSONRPC<T, EthMethods | Methods>

export interface WalletconnectV1HandlerContext {
  request: JSONRPC
  connector: WalletConnect
}

function rejectRequest(connector: WalletConnect, request: JSONRPC) {
  connector.rejectRequest({
    id: request.id,
    error: {
      message: 'USER_REJECTION' // optional
    }
  })
}

export class WalletconnectV1Handler implements WalletconnectHandler<WalletconnectV1HandlerContext> {
  public async readMessage(context: WalletconnectV1HandlerContext): Promise<WalletconnectMessage> {
    switch (context.request.method) {
      case Methods.SESSION_REQUEST:
        return this.readSessionRequest(context.request as JSONRPC<SessionRequest>, context.connector)
      case EthMethods.ETH_SENDTRANSACTION:
        return this.readEthSendTransaction(context.request as JSONRPC<EthTx>, context.connector)
      case EthMethods.PERSONAL_SIGN_REQUEST:
        return this.readPersonalSign(context.request as JSONRPC<string>, context.connector)
      case EthMethods.WALLET_SWITCH_ETHEREUM_CHAIN:
        return this.readWalletSwitchEthereumChain(context.request as JSONRPC<SwitchEthereumChain>, context.connector)
      case EthMethods.ETH_SIGN_TYPED_DATA:
        return { type: 'unsupported', namespace: Namespace.ETH, method: EthMethods.ETH_SIGN_TYPED_DATA }
      default:
        return { type: 'unsupported', namespace: Namespace.ETH }
    }
  }

  private readSessionRequest(request: JSONRPC<SessionRequest>, connector: WalletConnect): WalletconnectMessage {
    const chains: string[] | undefined =
      request.params[0].chainId !== undefined ? [`${Namespace.ETH}:${request.params[0].chainId}`] : undefined

    return {
      type: 'permissionRequest',
      chains,
      dAppMetadata: {
        name: request.params[0].peerMeta.name,
        description: request.params[0].peerMeta.description,
        url: request.params[0].peerMeta.url,
        icon: request.params[0].peerMeta.icons ? request.params[0].peerMeta.icons[0] : undefined
      },
      canOverrideChain: true,
      approve: async (accounts: string[]): Promise<void> => {
        const account = accounts[0]
        if (account === undefined || !(account.startsWith(Namespace.ETH) || account.startsWith('::'))) {
          return
        }

        const [_namespace, chainId, address] = account.split(':')
        const ethChainId = parseInt(chainId, 10)

        connector.approveSession({
          chainId: !isNaN(ethChainId) ? ethChainId : 1,
          accounts: [address]
        })
        await saveWalletConnectV1Session(connector.peerId, connector.session)
      },
      reject: async (): Promise<void> => {
        rejectRequest(connector, request)
      }
    }
  }

  private readEthSendTransaction(request: JSONRPC<EthTx>, connector: WalletConnect): WalletconnectMessage {
    return {
      type: 'signRequest',
      version: 1,
      namespace: Namespace.ETH,
      chain: `${Namespace.ETH}:${connector.chainId}`,
      request: {
        id: request.id.toString(),
        method: EthMethods.ETH_SENDTRANSACTION,
        params: request.params
      },
      cancel: async (): Promise<void> => {
        rejectRequest(connector, request)
      }
    }
  }

  private readPersonalSign(request: JSONRPC<string>, connector: WalletConnect): WalletconnectMessage {
    return {
      type: 'signRequest',
      version: 1,
      namespace: Namespace.ETH,
      chain: `${Namespace.ETH}:${connector.chainId}`,
      request: {
        id: request.id.toString(),
        method: EthMethods.PERSONAL_SIGN_REQUEST,
        params: request.params
      },
      cancel: async (): Promise<void> => {
        rejectRequest(connector, request)
      }
    }
  }

  private readWalletSwitchEthereumChain(request: JSONRPC<SwitchEthereumChain>, connector: WalletConnect): WalletconnectMessage {
    return {
      type: 'switchAccountRequest',
      namespace: Namespace.ETH,
      account: connector.accounts[0],
      dAppMetadata: {
        name: connector.peerMeta.name,
        description: connector.peerMeta.description,
        url: connector.peerMeta.url,
        icon: connector.peerMeta.icons ? connector.peerMeta.icons[0] : undefined
      },
      request: {
        id: request.id.toString(),
        method: EthMethods.WALLET_SWITCH_ETHEREUM_CHAIN,
        params: request.params
      },
      respond: async (chainId: number): Promise<void> => {
        connector.updateSession({
          chainId,
          accounts: connector.accounts
        })
        await saveWalletConnectV1Session(connector.peerId, connector.session)
      },
      cancel: async (): Promise<void> => {
        rejectRequest(connector, request)
      }
    }
  }
}
