import { Platform } from '@ionic/angular'
import { Injectable } from '@angular/core'
import { LedgerConnectionType, LedgerConnectionDetails, LedgerConnection } from 'src/app/ledger/connection/LedgerConnection'
// import { LedgerConnectionElectron } from 'src/app/ledger/connection/LedgerConnectionElectron' // DISABLED: Build errors
import { LedgerConnectionBrowser } from 'src/app/ledger/connection/LedgerConnectionBrowser'

@Injectable({
  providedIn: 'root'
})
export class LedgerConnectionProvider {
  public constructor(private readonly platform: Platform) {}

  public async getConnectedDevices(protocolIdentifier: string, connectionType: LedgerConnectionType): Promise<LedgerConnectionDetails[]> {
    // DISABLED: Build errors with LedgerConnectionElectron
    // if (this.platform.is('electron')) {
    //   return LedgerConnectionElectron.getConnectedDevices(connectionType)
    // }

    if (!this.platform.is('android') && !this.platform.is('ios')) {
      return LedgerConnectionBrowser.getConnectedDevices(protocolIdentifier, connectionType)
    }

    return []
  }

  public async open(protocolIdentifier: string, ledgerConnection?: LedgerConnectionDetails): Promise<LedgerConnection | null> {
    const connectionType: LedgerConnectionType | undefined = ledgerConnection ? ledgerConnection.type : undefined
    const descriptor: string | undefined = ledgerConnection ? ledgerConnection.descriptor : undefined

    // DISABLED: Build errors with LedgerConnectionElectron
    // if (this.platform.is('electron')) {
    //   return LedgerConnectionElectron.open(connectionType, descriptor)
    // }

    if (!this.platform.is('android') && !this.platform.is('ios')) {
      return LedgerConnectionBrowser.open(protocolIdentifier, connectionType, descriptor)
    }

    return null
  }
}
