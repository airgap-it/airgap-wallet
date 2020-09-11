import { IACMessageHandler } from '@airgap/angular-core'
import { Router } from '@angular/router'
import { AirGapMarketWallet, supportedProtocols } from 'airgap-coin-lib'

import { partition } from '../../../utils/utils'
import { AccountProvider } from '../../account/account.provider'
import { DataService, DataServiceKey } from '../../data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../sentry-error-handler/sentry-error-handler'

/**
 * Handles addresses and bitcoin style payment requests
 */
export class AddressHandler extends IACMessageHandler {
  public readonly name: string = 'AddressHandler'

  constructor(
    private readonly accountProvider: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router
  ) {
    super()
  }

  public async handle(data: string | string[]): Promise<boolean> {
    const str: string = typeof data === 'string' ? data : data[0]
    const splits: string[] = str.split(':') // Handle bitcoin payment request https://github.com/bitcoin/bips/blob/master/bip-0072.mediawiki

    if (splits.length > 1) {
      const [address]: string[] = splits[1].split('?') // Ignore amount
      const wallets: AirGapMarketWallet[] = this.accountProvider.getWalletList()
      for (const protocol of supportedProtocols()) {
        if (splits[0].toLowerCase() === protocol.symbol.toLowerCase() || splits[0].toLowerCase() === protocol.name.toLowerCase()) {
          const [compatibleWallets, incompatibleWallets]: [AirGapMarketWallet[], AirGapMarketWallet[]] = partition<AirGapMarketWallet>(
            wallets,
            (wallet: AirGapMarketWallet) => wallet.protocol.identifier === protocol.identifier
          )

          if (compatibleWallets.length > 0) {
            const info = {
              address,
              compatibleWallets,
              incompatibleWallets
            }
            this.dataService.setData(DataServiceKey.WALLET, info)
            this.router.navigateByUrl(`/select-wallet/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

            return true
          }
        }
      }

      return false
    } else {
      const { compatibleWallets, incompatibleWallets } = await this.accountProvider.getCompatibleAndIncompatibleWalletsForAddress(str)
      if (compatibleWallets.length > 0) {
        const info = {
          address: data,
          compatibleWallets,
          incompatibleWallets
        }
        this.dataService.setData(DataServiceKey.WALLET, info)
        this.router.navigateByUrl(`/select-wallet/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

        return true
      } else {
        return false
      }
    }
  }
}
