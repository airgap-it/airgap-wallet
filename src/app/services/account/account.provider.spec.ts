import { TestBed } from '@angular/core/testing'
import { AirGapMarketWallet, BitcoinProtocol, EthereumProtocol } from 'airgap-coin-lib'
import { take } from 'rxjs/operators'
import { PUSH_NOTIFICATIONS_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'

import { UnitHelper } from '../../../../test-config/unit-test-helper'
import { AccountProvider } from '../../services/account/account.provider'
import { PermissionsProvider } from '../permissions/permissions'

describe('AccountProvider', () => {
  let accountProvider: AccountProvider

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()
    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [
          { provide: PermissionsProvider, useValue: unitHelper.mockRefs.permissionsProvider },
          { provide: PUSH_NOTIFICATIONS_PLUGIN, useValue: unitHelper.mockRefs.pushNotifications }
        ]
      })
    )
      .compileComponents()
      .catch(console.error)
  })

  beforeEach(async () => {
    accountProvider = TestBed.get(AccountProvider)
    await accountProvider.walletChangedObservable.pipe(take(1)).toPromise() // Wait for initial load to be over
  })

  it('should be created', () => {
    expect(accountProvider instanceof AccountProvider).toBe(true)
  })

  it('should successfully add and persist ETH wallets', async done => {
    expect(accountProvider.getWalletList().length).toEqual(1)
    await accountProvider.addWallet(
      new AirGapMarketWallet(
        new EthereumProtocol(),
        '028ac261d61169c25398de21b5e7189daa0ed040baa17922dccc58cb6564d0c996',
        false,
        `m/44'/60'/0'/0/0`
      )
    )
    expect(accountProvider.getWalletList().length).toEqual(2)
    done()
  })

  it('should be able to compare wallets', async () => {
    const wallet1 = new AirGapMarketWallet(
      new EthereumProtocol(),
      '028ac261d61169c25398de21b5e7189daa0ed040baa17922dccc58cb6564d0c996',
      false,
      `m/44'/60'/0'/0/0`
    )
    const wallet1Same = new AirGapMarketWallet(
      new EthereumProtocol(),
      '028ac261d61169c25398de21b5e7189daa0ed040baa17922dccc58cb6564d0c996',
      false,
      `m/44'/60'/0'/0/0`
    )
    const wallet2 = new AirGapMarketWallet(
      new BitcoinProtocol(),
      '028ac261d61169c25398de21b5e7189daa0ed040baa17922dccc58cb6564d0c996',
      false,
      `m/44'/60'/0'/0/0`
    )
    const wallet1Plain = JSON.parse(JSON.stringify(wallet1))

    expect(accountProvider.isSameWallet(wallet1, wallet1Same)).toEqual(true)
    expect(accountProvider.isSameWallet(wallet1, wallet2)).toEqual(false)
    expect(accountProvider.isSameWallet(wallet1, undefined)).toEqual(false)
    expect(accountProvider.isSameWallet(wallet1, 'test' as any)).toEqual(false)
    expect(accountProvider.isSameWallet(wallet1, wallet1Plain)).toEqual(false)
  })

  it('should successfully add and persist BTC wallets', async () => {
    const wallet: AirGapMarketWallet = new AirGapMarketWallet(
      new BitcoinProtocol(),
      'xpub6EWbRuGLw9bTVVU9HE2MqT5QQ7zm9G64QgeZ5SY7qPWbciM7FyyG9BP2id1ewqZipXVWx2racXMMRvF1jB8S4syc1RzYRjnBhuq425KKYx5',
      true,
      `m/44'/0'/0'`
    )
    await accountProvider.removeWallet(wallet)
    expect(accountProvider.getWalletList().length).toEqual(0)
    await accountProvider.addWallet(wallet)
    expect(accountProvider.getWalletList().length).toEqual(1)
  })

  it('should update wallet observalbe when adding a wallet', async done => {
    const wallet: AirGapMarketWallet = new AirGapMarketWallet(
      new BitcoinProtocol(),
      'xpub6EWbRuGLw9bTVVU9HE2MqT5QQ7zm9G64QgeZ5SY7qPWbciM7FyyG9BP2id1ewqZipXVWx2racXMMRvF1jB8S4syc1RzYRjnBhuq425KKYx5',
      true,
      `m/44'/0'/0'`
    )

    let numOfTimesCalled: number = 0
    accountProvider.wallets.subscribe(() => {
      numOfTimesCalled++
      if (numOfTimesCalled >= 3) {
        // Needs to be 3 times
        // 1. Initial value
        // 2. Remove wallet
        // 3. Add wallet
        done()
      }
    })

    await accountProvider.removeWallet(wallet)
    expect(accountProvider.getWalletList().length).toEqual(0)
    await accountProvider.addWallet(wallet)
    expect(accountProvider.getWalletList().length).toEqual(1)
  })
})
