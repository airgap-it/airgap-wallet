import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'

export interface SerializedAirGapMarketWalletGroup {
  id: string
  label: string
  status: AirGapWalletStatus
  wallets: [string, string][]
}

export class AirGapMarketWalletGroup {
  private _label: string | null
  public get label(): string {
    return this._label
  }

  private _status: AirGapWalletStatus
  public get status(): AirGapWalletStatus {
    return this._status
  }

  constructor(
    public readonly id: string | undefined,
    label: string | undefined,
    public readonly wallets: AirGapMarketWallet[],
    public readonly transient: boolean = false
  ) {
    this.updateLabel(label)
    this.updateStatus()
  }

  public updateLabel(label: string): void {
    this._label = label
  }

  public updateStatus(): void {
    this._status = this.resolveStatus()
  }

  private resolveStatus(): AirGapWalletStatus {
    const status: Record<AirGapWalletStatus, number> = {
      active: 0,
      hidden: 0,
      deleted: 0
    }

    for (const wallet of this.wallets) {
      status[wallet.status]++
    }

    if (status.active > 0) {
      return AirGapWalletStatus.ACTIVE
    } else if (status.hidden > 0) {
      return AirGapWalletStatus.HIDDEN
    } else {
      return AirGapWalletStatus.DELETED
    }
  }

  public toJSON(): SerializedAirGapMarketWalletGroup {
    return {
      id: this.id,
      label: this.label,
      status: this.status,
      wallets: this.wallets.map((wallet: AirGapMarketWallet) => [wallet.protocol.identifier, wallet.publicKey])
    }
  }
}
