import { IACHandlerStatus } from '@airgap/angular-core'
import { BeaconHandler } from './beacon-handler'

describe('BeaconHandler', () => {
  let beaconHandler: BeaconHandler

  beforeEach(() => {
    const beaconServiceStub = {
      client: jasmine.createSpy('client').and.returnValue({
        isConnected: jasmine.createSpy('isConnected').and.returnValue(Promise.resolve())
      }),
      addPeer: jasmine.createSpy('addPeer').and.returnValue(Promise.resolve()),
      showLoader: jasmine.createSpy('showLoader').and.returnValue(Promise.resolve())
    }
    beaconHandler = new BeaconHandler(beaconServiceStub as any)
  })

  it('should have the correct name', () => {
    expect(beaconHandler.name).toBe('BeaconHandler')
  })

  describe('v1 request', () => {
    it('should handle plain json', async () => {
      const json =
        '{"name":"Beacon Example Dapp","publicKey":"1b3a7a1b8356cf48a3e32e167b92cd9e6865c755772bd2525f5b0db48bd85499","relayServer":"matrix.papers.tech"}'
      const result = await beaconHandler.receive(json)
      expect(result).toBe(IACHandlerStatus.SUCCESS)
    })
  })

  describe('v2 request', () => {
    const code =
      '2FvSuydwiGA3EfNJe1VL8jpLEXjSb4qGBo4uRt3yCHVVGuYk8WZVgSUrMiv3GuPH97EF5mM7uPBNwBEcobWAQewksKKeX229rgEPSoTf88vF9pmFjKo5rvkZ2UFfvpLDxB5psXpRg7yJmc5qevTRexvVCbToCPfgbHRhYJDzRtHyzNLpfTYTQzboP6y7vNeFZ9mNn9fRaMQtkqtH39GWueKZkQHKRW'

    it('should handle plain json', async () => {
      const json =
        '{"name":"Beacon Example Dapp","version":"2","publicKey":"ad78256671511be0660eefa901fc279247056485f302e49f147a2d067d515d9f","relayServer":"matrix.papers.tech"}'
      const result = await beaconHandler.receive(json)
      expect(result).toBe(IACHandlerStatus.SUCCESS)
    })

    it('should handle base58check encoded', async () => {
      const result = await beaconHandler.receive(code)
      expect(result).toBe(IACHandlerStatus.SUCCESS)
    })

    it('should handle base58check encoded with tezos:// prefix', async () => {
      const codeWithPrefix = `tezos://?type=tzip10&data=${code}`
      const result = await beaconHandler.receive(codeWithPrefix)
      expect(result).toBe(IACHandlerStatus.SUCCESS)
    })

    it('should handle base58check encoded with airgap-wallet:// prefix', async () => {
      const codeWithPrefix = `airgap-wallet://?type=tzip10&data=${code}`
      const result = await beaconHandler.receive(codeWithPrefix)
      expect(result).toBe(IACHandlerStatus.SUCCESS)
    })
  })
})
