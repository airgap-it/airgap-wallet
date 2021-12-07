import { IACMessageTransport } from '@airgap/angular-core'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'

export interface SerializedAirGapMarketWalletGroup {
  id: string
  label: string
  status: AirGapWalletStatus
  interactionSetting: InteractionSetting
  wallets: [string, string][]
}

export enum InteractionSetting {
  UNDETERMINED = 'undetermined',
  ALWAYS_ASK = 'always',
  SAME_DEVICE = 'same_device',
  OFFLINE_DEVICE = 'offline_device',
  LEDGER = 'ledger'
}

export const transportToInteractionSetting = (transport: IACMessageTransport): InteractionSetting => {
  switch (transport) {
    case IACMessageTransport.DEEPLINK:
      return InteractionSetting.SAME_DEVICE
    case IACMessageTransport.QR_SCANNER:
      return InteractionSetting.OFFLINE_DEVICE
    case IACMessageTransport.PASTE:
      return InteractionSetting.UNDETERMINED
  }
}

export class AirGapMarketWalletGroup {
  private _label: string | null
  public get label(): string {
    return this._label
  }

  private _interactionSetting: InteractionSetting

  public get interactionSetting(): InteractionSetting {
    return this._interactionSetting
  }

  public set interactionSetting(setting: InteractionSetting) {
    this._interactionSetting = setting
  }

  private _status: AirGapWalletStatus
  public get status(): AirGapWalletStatus {
    return this._status
  }

  constructor(
    public readonly id: string | undefined,
    label: string | undefined,
    interactionSetting: InteractionSetting | undefined,
    public readonly wallets: AirGapMarketWallet[],
    public readonly transient: boolean = false
  ) {
    this.updateLabel(label)
    this.updateInteractionSetting(interactionSetting)
    this.updateStatus()
  }

  public updateLabel(label: string): void {
    this._label = label
  }

  public updateStatus(): void {
    this._status = this.resolveStatus()
  }

  public updateInteractionSetting(interactionSetting: InteractionSetting): void {
    this._interactionSetting = interactionSetting ? interactionSetting : InteractionSetting.UNDETERMINED
  }

  private resolveStatus(): AirGapWalletStatus {
    const status: Record<AirGapWalletStatus, number> = {
      active: 0,
      hidden: 0,
      deleted: 0,
      transient: 0
    }

    for (const wallet of this.wallets) {
      status[wallet.status]++
    }

    if (status.active > 0) {
      return AirGapWalletStatus.ACTIVE
    } else if (status.hidden > 0) {
      return AirGapWalletStatus.HIDDEN
    } else if (status.deleted > 0) {
      return AirGapWalletStatus.DELETED
    } else {
      return AirGapWalletStatus.TRANSIENT
    }
  }

  public toJSON(): SerializedAirGapMarketWalletGroup {
    return {
      id: this.id,
      label: this.label,
      status: this.status,
      interactionSetting: this.interactionSetting,
      wallets: this.wallets
        .filter((wallet: AirGapMarketWallet) => wallet.status !== AirGapWalletStatus.TRANSIENT)
        .map((wallet: AirGapMarketWallet) => [wallet.protocol.identifier, wallet.publicKey])
    }
  }

  public includesWallet(wallet: AirGapMarketWallet) {
    return this.wallets.includes(wallet)
  }
}
