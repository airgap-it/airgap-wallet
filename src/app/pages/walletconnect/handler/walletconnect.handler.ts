import { WalletconnectMessage } from '../walletconnect.types'

export interface WalletconnectHandler<C> {
  readMessage(context: C): Promise<WalletconnectMessage>
}