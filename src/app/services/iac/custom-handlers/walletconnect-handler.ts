import { IACMessageWrapper, IACSinglePartHandler } from '@airgap/angular-core'
import { WalletconnectService } from '../../walletconnect/walletconnect.service'

/**
 * Handles walletconnect requests
 */
export class WalletConnectHandler extends IACSinglePartHandler<string> {
  public readonly name: string = 'WalletConnectHandler'

  constructor(private readonly walletConnectService: WalletconnectService) {
    super()
  }

  public async handleComplete(): Promise<IACMessageWrapper<string>> {
    await this.walletConnectService.connect(this.payload)

    return { result: this.payload, data: await this.getDataSingle() }
  }

  public async processData(data: string): Promise<string | undefined> {
    const payload: string = Array.isArray(data) ? data[0] : data
    if (typeof payload === 'string' && payload.startsWith('wc')) {
      return payload
    } else if (typeof payload === 'string' && payload.startsWith('airgap-wallet://wc?uri=')) {
      return decodeURIComponent(payload.replace('airgap-wallet://wc?uri=', ''))
    }

    return undefined
  }
}
