import { AirGapMarketWallet } from '@airgap/coinlib-core'

export interface SerializedAirGapMarketWalletGroup {
  id: string
  label: string
  wallets: [string, string][]
}

export class AirGapMarketWalletGroup {
  private _label: string
  public get label(): string {
    return this._label
  }

  constructor(public readonly id: string, label: string, public readonly wallets: AirGapMarketWallet[]) {
    this._label = label
  }

  public updateLabel(label: string): void {
    this._label = label
  }

  public toJSON(): SerializedAirGapMarketWalletGroup {
    return {
      id: this.id,
      label: this.label,
      wallets: this.wallets.map((wallet: AirGapMarketWallet) => [wallet.protocol.identifier, wallet.publicKey])
    }
  }
}
