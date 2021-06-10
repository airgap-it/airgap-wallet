import { IACSinglePartHandler } from '@airgap/angular-core'
import { WalletconnectService } from '../../walletconnect/walletconnect.service'

/**
 * Handles walletconnect requests
 */
export class WalletConnectHandler extends IACSinglePartHandler<string> {
  public readonly name: string = 'WalletConnectHandler'

  constructor(private readonly walletConnectService: WalletconnectService) {
    super()
  }

  public async handleComplete(): Promise<string> {
    await this.walletConnectService.connect(this.payload)

    return this.payload
  }

  public async processData(data: string): Promise<string | undefined> {
    const payload: string = Array.isArray(data) ? data[0] : data
    if (typeof payload === 'string' && payload.startsWith('wc')) {
      return payload
    } else if (typeof payload === 'string' && payload.startsWith('airgap-wallet://wc?uri=')) {
      return payload.replace('airgap-wallet://wc?uri=', '')
    }

    return undefined
  }
}
