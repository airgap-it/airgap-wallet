import { IACMessageHandler } from '@airgap/angular-core'
import { P2PPairInfo } from '@airgap/beacon-sdk'

import { BeaconService } from '../../beacon/beacon.service'

const isBeaconMessage: (obj: unknown) => obj is P2PPairInfo = (obj: unknown): obj is P2PPairInfo => {
  return (
    typeof (obj as P2PPairInfo).name === 'string' &&
    typeof (obj as P2PPairInfo).publicKey === 'string' &&
    typeof (obj as P2PPairInfo).relayServer === 'string'
  )
}

/**
 * Handles beacon requests
 *
 * This request is a stringified json with the properties "publicKey", "relayServer" and "name"
 */
export class BeaconHandler extends IACMessageHandler {
  public readonly name: string = 'BeaconHandler'

  constructor(private readonly beaconService: BeaconService) {
    super()
  }

  public async handle(data: string | string[]): Promise<boolean> {
    let json: Record<string, unknown> | undefined
    try {
      json = JSON.parse(typeof data === 'string' ? data : data[0])
    } catch (jsonParseError) {
      return false
    }

    if (isBeaconMessage(json)) {
      console.log('Beacon Pairing QR scanned', json)

      await this.beaconService.addPeer({ name: json.name, publicKey: json.publicKey, relayServer: json.relayServer })

      return true
    }
    console.log('beaconHandler', false)
    return false
  }
}
