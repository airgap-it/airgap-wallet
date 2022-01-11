import { Router } from '@angular/router'
import { AirGapMarketWallet, supportedProtocols } from '@airgap/coinlib-core'

import { partition } from '../../../utils/utils'
import { AccountProvider } from '../../account/account.provider'
import { DataService, DataServiceKey } from '../../data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../sentry-error-handler/sentry-error-handler'
import { IACMessageWrapper, IACSinglePartHandler } from '@airgap/angular-core'

interface Payload {
  address: string
  compatibleWallets: AirGapMarketWallet[]
  incompatibleWallets: AirGapMarketWallet[]
}

/**
 * Handles addresses and bitcoin style payment requests
 */
export class AddressHandler extends IACSinglePartHandler<Payload> {
  public readonly name: string = 'AddressHandler'

  constructor(
    private readonly accountProvider: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router
  ) {
    super()
  }

  public async handleComplete(): Promise<IACMessageWrapper<Payload>> {
    this.dataService.setData(DataServiceKey.WALLET, { actionType: 'scanned-address', ...this.payload })
    this.router.navigateByUrl(`/select-wallet/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    return { result: this.payload, data: await this.getDataSingle() }
  }

  public async processData(data: string): Promise<Payload | undefined> {
    const splits: string[] = data.split(':') // Handle bitcoin payment request https://github.com/bitcoin/bips/blob/master/bip-0072.mediawiki

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
            this.payload = {
              address,
              compatibleWallets,
              incompatibleWallets
            }
          }
        }
      }
    } else {
      const { compatibleWallets, incompatibleWallets } = await this.accountProvider.getCompatibleAndIncompatibleWalletsForAddress(data)
      if (compatibleWallets.length > 0) {
        this.payload = {
          address: data,
          compatibleWallets,
          incompatibleWallets
        }
      } else {
      }
    }

    return undefined
  }
}
