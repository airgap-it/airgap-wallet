import { async, TestBed } from '@angular/core/testing'

import { WalletsProvider } from '../../providers/wallets/wallets.provider'
import { StorageMock } from '../../../test-config/storage-mock'
import { Storage } from '@ionic/storage'
import { AirGapMarketWallet } from 'airgap-coin-lib'

describe('WalletsProvider', () => {
  let walletsProvider: WalletsProvider

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      providers: [WalletsProvider, { provide: Storage, useClass: StorageMock }]
    })
  }))

  beforeEach(async () => {
    walletsProvider = TestBed.get(WalletsProvider)
  })

  it('should be created', () => {
    expect(walletsProvider instanceof WalletsProvider).toBe(true)
  })

  it('should successfully add and persist ETH wallets', async () => {
    expect(walletsProvider.wallets.getValue().length).toEqual(1)
    await walletsProvider.addWallet(
      new AirGapMarketWallet('eth', '028ac261d61169c25398de21b5e7189daa0ed040baa17922dccc58cb6564d0c996', false, `m/44'/60'/0'/0/0`)
    )
    expect(walletsProvider.wallets.getValue().length).toEqual(2)
  })

  it('should successfully add and persist BTC wallets', async () => {
    let wallet = new AirGapMarketWallet(
      'btc',
      'xpub6EWbRuGLw9bTVVU9HE2MqT5QQ7zm9G64QgeZ5SY7qPWbciM7FyyG9BP2id1ewqZipXVWx2racXMMRvF1jB8S4syc1RzYRjnBhuq425KKYx5',
      true,
      `m/44'/0'/0'`
    )
    await walletsProvider.removeWallet(wallet)
    expect(walletsProvider.wallets.getValue().length).toEqual(0)
    await walletsProvider.addWallet(wallet)
    expect(walletsProvider.wallets.getValue().length).toEqual(1)
  })
})
