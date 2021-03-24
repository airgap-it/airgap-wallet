import { IACMessageHandler } from '@airgap/angular-core'

import { WalletconnectService } from '../../walletconnect/walletconnect.service'

/**
 * Handles walletconnect requests
 */
export class WalletConnectHandler extends IACMessageHandler {
  public readonly name: string = 'WalletConnectHandler'

  constructor(private readonly walletConnectService: WalletconnectService) {
    super()
  }

  public async handle(data: string | string[]): Promise<boolean> {
    // Check if it is a walletconnect request

    const payload: string = Array.isArray(data) ? data[0] : data
    if (typeof payload === 'string' && payload.startsWith('wc')) {
      console.log('WalletConnect QR scanned', payload)

      await this.walletConnectService.connect(payload)

      return true
    } else if (typeof payload === 'string' && payload.startsWith('airgap-wallet://wc?uri=')) {
      await this.walletConnectService.connect(payload.replace('airgap-wallet://wc?uri=', ''))
      return true
    }

    return false
  }
}
