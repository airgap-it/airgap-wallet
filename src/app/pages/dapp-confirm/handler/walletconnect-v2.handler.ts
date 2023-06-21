import V2Client from '@walletconnect/web3wallet'
import { getSdkError } from '@walletconnect/utils'

import { WalletconnectHandler } from './walletconnect.handler'

export interface WalletconnectV2HandlerContext {
  id: number
  topic: string
  result: string
  client: V2Client
}

export class WalletconnectV2Handler implements WalletconnectHandler<WalletconnectV2HandlerContext> {
  public async readResult(context: WalletconnectV2HandlerContext): Promise<string> {
    return context.result
  }

  public async approveRequest(context: WalletconnectV2HandlerContext): Promise<void> {
    context.client.respondSessionRequest({
      topic: context.topic,
      response: {
        id: context.id,
        jsonrpc: '2.0',
        result: context.result
      }
    })
  }

  public async rejectRequest(context: WalletconnectV2HandlerContext): Promise<void> {
    context.client.respondSessionRequest({
      topic: context.topic,
      response: {
        id: context.id,
        jsonrpc: '2.0',
        error: getSdkError('USER_REJECTED')
      }
    })
  }
}
