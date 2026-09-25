import { flattened } from '@airgap/angular-core'
import { PermissionScope } from '@airgap/beacon-sdk'
import { AirGapMarketWallet, NetworkType, ProtocolNetwork, ProtocolSymbols } from '@airgap/coinlib-core'
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { AccountProvider } from 'src/app/services/account/account.provider'

export interface CheckboxInput {
  name: string
  type: 'radio' | 'checkbox'
  label: string
  value: PermissionScope
  icon: string
  checked: boolean
}

@Component({
  selector: 'permission-request',
  templateUrl: './permission-request.component.html',
  styleUrls: ['./permission-request.component.scss']
})
export class PermissionRequestComponent implements OnChanges {
  public readonly networkType: typeof NetworkType = NetworkType

  public wallets: Partial<Record<ProtocolSymbols, AirGapMarketWallet[]>> = {}
  /** The wallets the dApp can be paired with, grouped by protocol, in display order. */
  public selectableWallets: AirGapMarketWallet[] = []

  @Input()
  public address: string = ''

  @Input()
  public protocolIdentifier: ProtocolSymbols | undefined

  @Input()
  public network: ProtocolNetwork | undefined

  @Input()
  public requesterName: string = ''

  @Input()
  public icon: string = ''

  @Input()
  public inputs: CheckboxInput[] = []

  @Input()
  public targetProtocolSymbol: ProtocolSymbols | ProtocolSymbols[] | undefined

  @Output()
  public readonly walletSetEmitter: EventEmitter<AirGapMarketWallet> = new EventEmitter<AirGapMarketWallet>()

  public constructor(private readonly accountService: AccountProvider) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes.targetProtocolSymbol?.currentValue !== changes.targetProtocolSymbol?.previousValue) {
      const allWallets = this.accountService.getActiveWalletList()
      const targetProtocolSymbol = changes.targetProtocolSymbol.currentValue
      const targetProtocolSymbols = new Set(Array.isArray(targetProtocolSymbol) ? targetProtocolSymbol : [targetProtocolSymbol])

      this.wallets = allWallets.reduce((obj: Partial<Record<ProtocolSymbols, AirGapMarketWallet[]>>, wallet: AirGapMarketWallet) => {
        const protocolIdentifier = wallet.protocol.identifier
        if (!targetProtocolSymbols.has(wallet.protocol.identifier)) {
          return obj
        }

        const wallets = obj[wallet.protocol.identifier] ?? []
        wallets.push(wallet)

        return Object.assign(obj, { [protocolIdentifier]: wallets })
      }, {})
      this.selectableWallets = flattened(Object.values(this.wallets))
    }
  }

  public isSelected(wallet: AirGapMarketWallet): boolean {
    return (
      wallet.receivingPublicAddress === this.address &&
      (this.protocolIdentifier ? wallet.protocol.identifier === this.protocolIdentifier : true)
    )
  }

  public selectWallet(wallet: AirGapMarketWallet): void {
    this.walletSetEmitter.emit(wallet)
  }

  public trackByWallet(_index: number, wallet: AirGapMarketWallet): string {
    return `${wallet.protocol.identifier}:${wallet.publicKey}:${wallet.addressIndex ?? ''}`
  }
}
