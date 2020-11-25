import { IACMessageHandler } from '@airgap/angular-core'
import { P2PPairingRequest, Serializer } from '@airgap/beacon-sdk'

import { BeaconService } from '../../beacon/beacon.service'

const isBeaconMessage: (obj: unknown) => obj is P2PPairingRequest = (obj: unknown): obj is P2PPairingRequest => {
  return (
    typeof (obj as P2PPairingRequest).name === 'string' &&
    typeof (obj as P2PPairingRequest).publicKey === 'string' &&
    typeof (obj as P2PPairingRequest).relayServer === 'string'
    // version is not checked to be v1 compatible
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
    const tryHandleBeacon: (json: unknown) => Promise<void> = async (json: unknown): Promise<void> => {
      if (isBeaconMessage(json)) {
        console.log('Beacon Pairing QR scanned', json)

        await this.beaconService.client.isConnected
        await this.beaconService.addPeer(json)
      }
    }

    const stringData: string = typeof data === 'string' ? data : data[0]

    // Check if it's a beacon request
    try {
      const json: Record<string, unknown> = JSON.parse(stringData)
      await tryHandleBeacon(json)

      return true
    } catch (e) {
      try {
        const payload: string = stringData
        if (payload.startsWith('tezos://') || payload.startsWith('airgap-wallet://')) {
          const params: URLSearchParams = new URL(payload).searchParams
          if (params && params.get('type') === 'tzip10') {
            const json: Record<string, unknown> = (await new Serializer().deserialize(params.get('data'))) as any
            await tryHandleBeacon(json)

            return true
          }
        } else {
          const json: Record<string, unknown> = (await new Serializer().deserialize(stringData)) as any
          await tryHandleBeacon(json)

          return true
        }
      } catch (err) {
        //
      }
      //
    }

    return false
  }
}
