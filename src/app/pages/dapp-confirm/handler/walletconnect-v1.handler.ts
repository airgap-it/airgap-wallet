import WalletConnect from '@walletconnect/client'

import { WalletconnectHandler } from './walletconnect.handler'

export interface WalletconnectV1HandlerContext {
  id: number
  result: string
  connector: WalletConnect
}

export class WalletconnectV1Handler implements WalletconnectHandler<WalletconnectV1HandlerContext> {
  public async readResult(context: WalletconnectV1HandlerContext): Promise<string> {
    return context.result
  }

  public async approveRequest(context: WalletconnectV1HandlerContext): Promise<void> {
    context.connector.approveRequest({
      id: context.id,
      result: context.result
    })
  }

  public async rejectRequest(context: WalletconnectV1HandlerContext): Promise<void> {
    context.connector.rejectRequest({
      id: context.id,
      error: {
        message: 'USER_REJECTION'
      }
    })
  }
}
