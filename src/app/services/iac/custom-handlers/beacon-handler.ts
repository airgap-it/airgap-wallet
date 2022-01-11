import { IACMessageWrapper, IACSinglePartHandler } from '@airgap/angular-core'
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

const isValidUrl: (url: string) => Promise<boolean> = async (url: string): Promise<boolean> => {
  try {
    // tslint:disable-next-line: no-unused-expression
    new URL(url)
  } catch {
    return false
  }

  return true
}

export class BeaconHandler extends IACSinglePartHandler<P2PPairingRequest> {
  public readonly name: string = 'BeaconHandler'

  constructor(private readonly beaconService: BeaconService) {
    super()
  }

  public async handleComplete(): Promise<IACMessageWrapper<P2PPairingRequest>> {
    await this.beaconService.client.isConnected
    await this.beaconService.addPeer(this.payload)

    return { result: this.payload, data: await this.getDataSingle() }
  }

  public async processData(data: string): Promise<P2PPairingRequest | undefined> {
    let payload = data

    if (await isValidUrl(data)) {
      const params: URLSearchParams = new URL(data).searchParams
      if (params && params.get('type') === 'tzip10') {
        payload = params.get('data')
      }
    }

    try {
      const json: Record<string, unknown> = (await new Serializer().deserialize(payload)) as any

      if (isBeaconMessage(json)) {
        return json
      }
    } catch {}

    try {
      const json = JSON.parse(data)
      if (isBeaconMessage(json)) {
        return json
      }
    } catch {}

    return undefined
  }
}
