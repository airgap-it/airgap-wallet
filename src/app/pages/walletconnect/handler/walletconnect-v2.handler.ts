import { Web3WalletTypes } from '@walletconnect/web3wallet'
import V2Client from '@walletconnect/web3wallet'
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils'

import { EthMethods, Namespace, WalletconnectMessage } from '../walletconnect.types'
import { WalletconnectHandler } from './walletconnect.handler'

export interface WalletconnectV2HandlerContext {
  message:
    | {
        type: 'session_proposal'
        proposal: Web3WalletTypes.SessionProposal
      }
    | {
        type: 'session_request'
        request: Web3WalletTypes.SessionRequest
      }
  client: V2Client
}

function rejectRequest(client: V2Client, id: number, topic: string) {
  client.respondSessionRequest({
    topic,
    response: {
      id,
      jsonrpc: '2.0',
      error: getSdkError('USER_REJECTED')
    }
  })
}

export class WalletconnectV2Handler implements WalletconnectHandler<WalletconnectV2HandlerContext> {
  public async readMessage(context: WalletconnectV2HandlerContext): Promise<WalletconnectMessage> {
    switch (context.message.type) {
      case 'session_proposal':
        return this.readSessionProposal(context.message.proposal, context.client)
      case 'session_request':
        return this.readSessionRequest(context.message.request, context.client)
      default:
        return { type: 'unsupported' }
    }
  }

  private readSessionProposal(proposal: Web3WalletTypes.SessionProposal, client: V2Client): WalletconnectMessage {
    const requiredChains: string[] = this.getChainsFromNamespace(proposal.params.requiredNamespaces ?? {})
    const optionalChains: string[] = this.getChainsFromNamespace(proposal.params.optionalNamespaces ?? {})
    const requestedChains: string[] = requiredChains.concat(optionalChains)

    return {
      type: 'permissionRequest',
      chains: requestedChains,
      dAppMetadata: {
        name: proposal.params.proposer.metadata.name,
        description: proposal.params.proposer.metadata.description,
        url: proposal.params.proposer.metadata.url,
        icon: proposal.params.proposer.metadata.icons[0]
      },
      approve: async (accounts: string[]): Promise<void> => {
        const getEthNamespace = (accounts: string[]): any => {
          const ethAccounts = accounts.filter((account: string) => account.startsWith(Namespace.ETH))
          if (ethAccounts.length === 0) {
            return undefined
          }

          // eslint-disable-next-line prettier/prettier
          const requiredEthNamespace: Web3WalletTypes.SessionProposal['params']['requiredNamespaces'][string] = (proposal.params
            .requiredNamespaces ?? {})[Namespace.ETH] ?? { methods: [], events: [] }
          // eslint-disable-next-line prettier/prettier
          const optionalEthNamespace: Web3WalletTypes.SessionProposal['params']['optionalNamespaces'][string] = (proposal.params
            .optionalNamespaces ?? {})[Namespace.ETH] ?? { methods: [], events: [] }

          // for now, let's use the selected account for all required chains
          if (ethAccounts.length === 1) {
            const requiredEthChains = requiredEthNamespace.chains ?? []
            const [namespace, chainId, address] = ethAccounts[0].split(':')

            ethAccounts.push(
              ...requiredEthChains
                .filter((chain: string) => chain !== `${namespace}:${chainId}`)
                .map((chain: string) => `${chain}:${address}`)
            )
          }

          const chains = ethAccounts.map((account: string) => {
            const [namespace, chainId, _address] = account.split(':')

            return `${namespace}:${chainId}`
          })

          const optionalEthMethods = new Set(optionalEthNamespace.methods)
          const methods = new Set([
            ...requiredEthNamespace.methods,
            ...Object.values(EthMethods).filter((method: EthMethods) => optionalEthMethods.has(method))
          ])

          return {
            chains,
            methods: Array.from(methods),
            events: requiredEthNamespace?.events ?? [],
            accounts: ethAccounts
          }
        }

        const approvedNamespaces = buildApprovedNamespaces({
          proposal: proposal.params,
          supportedNamespaces: {
            [Namespace.ETH]: getEthNamespace(accounts)
          }
        })

        await client.approveSession({
          id: proposal.id,
          namespaces: approvedNamespaces
        })
      },
      reject: async (): Promise<void> => {
        await client.rejectSession({
          id: proposal.id,
          reason: getSdkError('USER_REJECTED')
        })
      }
    }
  }

  private getChainsFromNamespace(
    namespaces:
      | Web3WalletTypes.SessionProposal['params']['requiredNamespaces']
      | Web3WalletTypes.SessionProposal['params']['optionalNamespaces']
  ): string[] {
    return Object.values(namespaces).flatMap((namespace) => namespace.chains ?? [])
  }

  private readSessionRequest(request: Web3WalletTypes.SessionRequest, client: V2Client): WalletconnectMessage {
    if (request.params.chainId.startsWith(Namespace.ETH)) {
      return this.readEthSessionRequest(request, client)
    }

    return { type: 'unsupported' }
  }

  private readEthSessionRequest(request: Web3WalletTypes.SessionRequest, client: V2Client): WalletconnectMessage {
    switch (request.params.request.method) {
      case EthMethods.ETH_SENDTRANSACTION:
        return this.readEthSendTransaction(request, client)
      case EthMethods.PERSONAL_SIGN_REQUEST:
        return this.readPersonalSign(request, client)
      case EthMethods.WALLET_SWITCH_ETHEREUM_CHAIN:
        return this.readWalletSwitchEthereumChain(request, client)
      case EthMethods.ETH_SIGN_TYPED_DATA:
      case EthMethods.ETH_SIGN_TYPED_DATA_V3:
      case EthMethods.ETH_SIGN_TYPED_DATA_V4:
        return this.readEthSignTypedData(request, client)
      case EthMethods.ETH_SIGN:
        return this.readEthSign(request, client)
      // return { type: 'unsupported', namespace: Namespace.ETH, method: EthMethods.ETH_SIGN_TYPED_DATA }
      default:
        return { type: 'unsupported', namespace: Namespace.ETH }
    }
  }

  private readEthSign(request: Web3WalletTypes.SessionRequest, client: V2Client): WalletconnectMessage {
    request.params.request.params = [request.params.request.params[1], request.params.request.params[0]]
    return {
      type: 'signRequest',
      version: 2,
      namespace: Namespace.ETH,
      chain: request.params.chainId,
      request: {
        id: `${request.id}:${request.topic}`,
        method: EthMethods.ETH_SIGN,
        params: request.params.request.params
      },
      cancel: async (): Promise<void> => {
        rejectRequest(client, request.id, request.topic)
      }
    }
  }

  private readEthSignTypedData(request: Web3WalletTypes.SessionRequest, client: V2Client): WalletconnectMessage {
    request.params.request.params = [request.params.request.params[1], request.params.request.params[0]]

    return {
      type: 'signRequest',
      version: 2,
      namespace: Namespace.ETH,
      chain: request.params.chainId,
      request: {
        id: `${request.id}:${request.topic}`,
        method: EthMethods.ETH_SIGN_TYPED_DATA,
        params: request.params.request.params
      },
      cancel: async (): Promise<void> => {
        rejectRequest(client, request.id, request.topic)
      }
    }
  }

  private readEthSendTransaction(request: Web3WalletTypes.SessionRequest, client: V2Client): WalletconnectMessage {
    return {
      type: 'signRequest',
      version: 2,
      namespace: Namespace.ETH,
      chain: request.params.chainId,
      request: {
        id: `${request.id}:${request.topic}`,
        method: EthMethods.ETH_SENDTRANSACTION,
        params: request.params.request.params
      },
      cancel: async (): Promise<void> => {
        rejectRequest(client, request.id, request.topic)
      }
    }
  }

  private readPersonalSign(request: Web3WalletTypes.SessionRequest, client: V2Client): WalletconnectMessage {
    return {
      type: 'signRequest',
      version: 2,
      namespace: Namespace.ETH,
      chain: request.params.chainId,
      request: {
        id: `${request.id}:${request.topic}`,
        method: EthMethods.PERSONAL_SIGN_REQUEST,
        params: request.params.request.params
      },
      cancel: async (): Promise<void> => {
        rejectRequest(client, request.id, request.topic)
      }
    }
  }

  // TODO: check if it's working (couldn't find a dApp that would send that message)
  private readWalletSwitchEthereumChain(request: Web3WalletTypes.SessionRequest, client: V2Client): WalletconnectMessage {
    const [namespace] = request.params.chainId.split(':', 1)
    const session = client.getActiveSessions()[request.topic]
    const accounts = session.namespaces[namespace]?.accounts ?? []
    const account = accounts ? accounts[0].split(':')[2] : undefined

    return {
      type: 'switchAccountRequest',
      namespace: Namespace.ETH,
      account,
      dAppMetadata: {
        name: session.peer.metadata.name,
        description: session.peer.metadata.description,
        url: session.peer.metadata.url,
        icon: session.peer.metadata.icons ? session.peer.metadata.icons[0] : undefined
      },
      request: {
        id: `${request.id}:${request.topic}`,
        method: EthMethods.WALLET_SWITCH_ETHEREUM_CHAIN,
        params: request.params.request.params
      },
      respond: async (chainId: number): Promise<void> => {
        client.emitSessionEvent({
          topic: request.topic,
          event: {
            name: 'chainChanged',
            data: accounts
          },
          chainId: `${Namespace.ETH}:${chainId}`
        })
      },
      cancel: async (): Promise<void> => {
        rejectRequest(client, request.id, request.topic)
      }
    }
  }
}
