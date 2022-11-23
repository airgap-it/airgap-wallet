import { getProtocolAndNetworkIdentifier, ProtocolService } from '@airgap/angular-core'
import { hasConfigurableContract, MainProtocolSymbols, ProtocolSymbols } from '@airgap/coinlib-core'
import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController } from '@ionic/angular'
import { AccountProvider } from 'src/app/services/account/account.provider'

import { WalletStorageKey, WalletStorageService } from '../../services/storage/storage'

@Component({
  selector: 'page-set-contract',
  templateUrl: 'set-contract.html'
})
export class SetContractPage {
  public readonly MainProtocolSymbols: typeof MainProtocolSymbols = MainProtocolSymbols

  public readonly protocolID: ProtocolSymbols
  public readonly networkID: string

  public readonly protocolName: string

  public contractAddress: string | undefined
  public configuration: any | undefined

  constructor(
    private readonly route: ActivatedRoute,
    private readonly navController: NavController,
    private readonly protocolService: ProtocolService,
    private readonly storage: WalletStorageService,
    private readonly accountProvider: AccountProvider
  ) {
    this.protocolID = this.route.snapshot.params.protocolID
    this.networkID = this.route.snapshot.params.networkID

    this.protocolName = `set-contract.${this.protocolID}.name`
  }

  public setContractAddress(addressWithConfiguration: { address: string; configuration?: any } | undefined): void {
    this.contractAddress = addressWithConfiguration?.address
    this.configuration = addressWithConfiguration?.configuration
  }

  public async saveContractAddress(): Promise<void> {
    const contractAddress = this.contractAddress
    const configuration = this.configuration
    if (!contractAddress) {
      return
    }

    const protocol = await this.protocolService.getProtocol(this.protocolID, this.networkID)
    if (!hasConfigurableContract(protocol)) {
      return
    }

    const protocolAndNetworkIdentifier = await getProtocolAndNetworkIdentifier(protocol)

    await Promise.all([
      protocol.setContractAddress(contractAddress, configuration),
      this.storage.get(WalletStorageKey.CONTRACT_ADDRESSES).then((contractAddresses) => {
        return this.storage.set(
          WalletStorageKey.CONTRACT_ADDRESSES,
          Object.assign(contractAddresses, {
            [protocolAndNetworkIdentifier]: { address: contractAddress, configuration }
          })
        )
      })
    ])

    this.accountProvider.triggerWalletChanged()
    this.navController.back()
  }
}
