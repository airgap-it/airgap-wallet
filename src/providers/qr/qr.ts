import { Injectable } from '@angular/core'
import { AirGapMarketWallet, getProtocolByIdentifier } from 'airgap-coin-lib'
import { Transaction } from '../../models/transaction.model'

@Injectable()
export class QrProvider {

  public getWalletFromData(data: string): AirGapMarketWallet {
    let json = this.extractData(data)

    let requiredProperties = ['publicKey', 'isExtendedPublicKey', 'protocolIdentifier', 'derivationPath']

    requiredProperties.forEach(property => {
      if (!json.hasOwnProperty(property)) {
        throw new Error(`Unable to extract wallet from data. property "${property}" missing`)
      }
    })

    return new AirGapMarketWallet(json.protocolIdentifier, json.publicKey, json.isExtendedPublicKey, json.derivationPath)
  }

  public getBroadcastFromData(data: string): Transaction {
    let json = this.extractData(data)
    let airgapTx = getProtocolByIdentifier(json.protocolIdentifier).getTransactionDetailsFromRaw(json, json.payload)
    return Transaction.fromAirGapTx(airgapTx, json.payload)
  }

  private extractData(data: string): any {
    try {
      let jsonText = window.atob(data)
      let json = JSON.parse(jsonText)
      return json
    } catch (e) {
      console.error('Could not read data from QR code', e)
      return null
    }
  }
}
