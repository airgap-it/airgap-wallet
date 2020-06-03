import { Platform } from '@ionic/angular'
import { Injectable } from '@angular/core'
import { LedgerConnectionType, LedgerConnection, LedgerTransport } from 'src/app/ledger/transport/LedgerTransport'
import { LedgerTransportElectron } from 'src/app/ledger/transport/LedgerTransportElectron'
import { LedgerTransportBrowser } from 'src/app/ledger/transport/LedgerTransportBrowser'

@Injectable({
  providedIn: 'root'
})
export class LedgerTransportProvider {
  constructor(private readonly platform: Platform) {}

  public async getConnectedDevices(connectionType: LedgerConnectionType): Promise<LedgerConnection[]> {
    if (this.platform.is('electron')) {
      return LedgerTransportElectron.getConnectedDevices(connectionType)
    }

    if (!this.platform.is('android') && !this.platform.is('ios')) {
      return LedgerTransportBrowser.getConnectedDevices(connectionType)
    }

    return []
  }

  public async open(connectionType: LedgerConnectionType, descriptor: string): Promise<LedgerTransport | null> {
    if (this.platform.is('electron')) {
      return LedgerTransportElectron.open(connectionType, descriptor)
    }

    if (!this.platform.is('android') && !this.platform.is('ios')) {
      return LedgerTransportBrowser.open(connectionType, descriptor)
    }

    return null
  }
}
