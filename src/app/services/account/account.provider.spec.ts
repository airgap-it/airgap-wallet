import {
  APP_INFO_PLUGIN,
  APP_PLUGIN,
  createV0BitcoinProtocol,
  createV0EthereumProtocol,
  FILESYSTEM_PLUGIN,
  PermissionsService
} from '@airgap/angular-core'
import { AirGapCoinWallet, AirGapMarketWallet, AirGapWalletStatus } from '@airgap/coinlib-core'
import { TestBed, waitForAsync } from '@angular/core/testing'
import { take } from 'rxjs/operators'

import { UnitHelper } from '../../../../test-config/unit-test-helper'
import { PriceServiceMock } from '../../../../test-config/wallet-mock'
import { FILE_PICKER_PLUGIN, PUSH_NOTIFICATIONS_PLUGIN } from '../../capacitor-plugins/injection-tokens'
import { AccountProvider } from '../../services/account/account.provider'
import { AppService } from '../app/app.service'
import { PushBackendProvider } from '../push-backend/push-backend'

describe('AccountProvider', () => {
  let accountProvider: AccountProvider
  let appService: AppService

  let unitHelper: UnitHelper

  beforeEach(
    waitForAsync(async () => {
      unitHelper = new UnitHelper()
      appService = new AppService()
      appService.setReady()

      await TestBed.configureTestingModule(
        unitHelper.testBed({
          providers: [
            { provide: PermissionsService, useValue: unitHelper.mockRefs.permissionsProvider },
            { provide: APP_PLUGIN, useValue: unitHelper.mockRefs.app },
            { provide: APP_INFO_PLUGIN, useValue: unitHelper.mockRefs.appInfo },
            { provide: PUSH_NOTIFICATIONS_PLUGIN, useValue: unitHelper.mockRefs.pushNotifications },
            { provide: FILE_PICKER_PLUGIN, useValue: unitHelper.mockRefs.filePicker },
            { provide: FILESYSTEM_PLUGIN, useValue: unitHelper.mockRefs.filesystem },
            { provide: AppService, useValue: appService },
            { provide: PushBackendProvider, useValue: unitHelper.mockRefs.pushBackendProvider }
          ]
        })
      )
        .compileComponents()
        .catch(console.error)

      accountProvider = TestBed.inject(AccountProvider)
      await accountProvider.walletChangedObservable.pipe(take(1)).toPromise() // Wait for initial load to be over
    })
  )

  it('should be created', () => {
    expect(accountProvider instanceof AccountProvider).toBe(true)
  })

  it('should successfully add and persist ETH wallets', async (done) => {
    const currentLength = accountProvider.getWalletList().length
    const wallet = new AirGapCoinWallet(
      await createV0EthereumProtocol(),
      '028ac261d61169c25398de21b5e7189daa0ed040baa17922dccc58cb6564d0c996',
      false,
      `m/44'/60'/0'/0/0`,
      '',
      AirGapWalletStatus.ACTIVE,
      new PriceServiceMock()
    )
    const walletAddInfo = [
      {
        walletToAdd: wallet
      }
    ]

    await accountProvider.addWallets(walletAddInfo)
    expect(accountProvider.getWalletList().length).toEqual(currentLength + 1)
    done()
  })

  it('should be able to compare wallets', async (done) => {
    const wallet1 = new AirGapCoinWallet(
      await createV0EthereumProtocol(),
      '028ac261d61169c25398de21b5e7189daa0ed040baa17922dccc58cb6564d0c996',
      false,
      `m/44'/60'/0'/0/0`,
      '',
      AirGapWalletStatus.ACTIVE,
      new PriceServiceMock()
    )
    const wallet1Same = new AirGapCoinWallet(
      await createV0EthereumProtocol(),
      '028ac261d61169c25398de21b5e7189daa0ed040baa17922dccc58cb6564d0c996',
      false,
      `m/44'/60'/0'/0/0`,
      '',
      AirGapWalletStatus.ACTIVE,
      new PriceServiceMock()
    )
    const wallet2 = new AirGapCoinWallet(
      await createV0BitcoinProtocol(),
      '028ac261d61169c25398de21b5e7189daa0ed040baa17922dccc58cb6564d0c996',
      false,
      `m/44'/60'/0'/0/0`,
      '',
      AirGapWalletStatus.ACTIVE,
      new PriceServiceMock()
    )
    const wallet1Plain = JSON.parse(JSON.stringify(wallet1))

    expect(accountProvider.isSameWallet(wallet1, wallet1Same)).toEqual(true)
    expect(accountProvider.isSameWallet(wallet1, wallet2)).toEqual(false)
    expect(accountProvider.isSameWallet(wallet1, undefined)).toEqual(false)
    expect(accountProvider.isSameWallet(wallet1, 'test' as any)).toEqual(false)
    expect(accountProvider.isSameWallet(wallet1, wallet1Plain)).toEqual(false)
    done()
  })

  it('should successfully add and persist BTC wallets', async (done) => {
    const wallet: AirGapMarketWallet = new AirGapCoinWallet(
      await createV0BitcoinProtocol(),
      'xpub6EWbRuGLw9bTVVU9HE2MqT5QQ7zm9G64QgeZ5SY7qPWbciM7FyyG9BP2id1ewqZipXVWx2racXMMRvF1jB8S4syc1RzYRjnBhuq425KKYx5',
      true,
      `m/44'/0'/0'`,
      '',
      AirGapWalletStatus.ACTIVE,
      new PriceServiceMock()
    )
    await accountProvider.removeWallet(wallet)
    expect(accountProvider.getWalletList().filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE).length).toEqual(0)
    const walletAddInfo = [
      {
        walletToAdd: wallet
      }
    ]
    await accountProvider.addWallets(walletAddInfo)
    expect(accountProvider.getWalletList().filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE).length).toEqual(1)
    done()
  })

  it('should update wallet observalbe when adding a wallet', async (done) => {
    const wallet: AirGapMarketWallet = new AirGapCoinWallet(
      await createV0BitcoinProtocol(),
      'xpub6EWbRuGLw9bTVVU9HE2MqT5QQ7zm9G64QgeZ5SY7qPWbciM7FyyG9BP2id1ewqZipXVWx2racXMMRvF1jB8S4syc1RzYRjnBhuq425KKYx5',
      true,
      `m/44'/0'/0'`,
      '',
      AirGapWalletStatus.ACTIVE,
      new PriceServiceMock()
    )

    let numOfTimesCalled: number = 0
    accountProvider.wallets$.subscribe(() => {
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
    expect(accountProvider.getWalletList().filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE).length).toEqual(0)

    const walletAddInfo = [
      {
        walletToAdd: wallet
      }
    ]
    await accountProvider.addWallets(walletAddInfo)
    expect(accountProvider.getWalletList().filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE).length).toEqual(1)
    done()
  })
})
