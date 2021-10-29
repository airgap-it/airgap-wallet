import { AmountConverterPipe, CLIPBOARD_PLUGIN, SPLASH_SCREEN_PLUGIN, STATUS_BAR_PLUGIN, ClipboardService } from '@airgap/angular-core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { NavParams, Platform } from '@ionic/angular'
import { Storage } from '@ionic/storage'
import { OperationsProvider } from 'src/app/services/operations/operations'
import { OperationsServiceMock } from 'src/app/services/operations/operations.mock'

import { ClipboardMock, SplashScreenMock, StatusBarMock } from '../../../../test-config/plugins-mock'
import { NavParamsMock, PlatformMock } from '../../../../test-config/mocks-ionic'
import { StorageMock } from '../../../../test-config/storage-mock'
import { UnitHelper } from '../../../../test-config/unit-test-helper'
import { WalletMock } from '../../../../test-config/wallet-mock'
import { AccountProviderMock } from '../../../../test-config/accountProvider-mock'
import { AccountProvider } from '../../services/account/account.provider'

import { TransactionPreparePage } from './transaction-prepare'
import { InteractionService } from 'src/app/services/interaction/interaction.service'
import { InteractionServiceMock } from 'src/app/services/interaction/interaction.mock'

describe('TransactionPrepare Page', () => {
  const ethWallet = new WalletMock().ethWallet
  const ethTransaction = new WalletMock().ethTransaction

  // const btcWallet = new WalletMock().btcWallet
  // const btcTransaction = new WalletMock().btcTransaction

  let fixture: ComponentFixture<TransactionPreparePage>
  let component: TransactionPreparePage

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()

    WalletMock.injectSecret()

    const routeInfo = {
      snapshot: {
        data: {
          special: {
            transaction: ethTransaction,
            wallet: ethWallet
          }
        },
        params: {
          publicKey: ethWallet.publicKey,
          protocolID: ethWallet.protocol.identifier,
          addressIndex: ethWallet.addressIndex,
          mainProtocolID: ethWallet.protocol.identifier
        }
      }
    }

    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [
          { provide: AccountProvider, useClass: AccountProviderMock },
          { provide: Storage, useClass: StorageMock },
          { provide: NavParams, useClass: NavParamsMock },
          { provide: CLIPBOARD_PLUGIN, useClass: ClipboardMock },
          { provide: STATUS_BAR_PLUGIN, useClass: StatusBarMock },
          { provide: SPLASH_SCREEN_PLUGIN, useClass: SplashScreenMock },
          { provide: Platform, useClass: PlatformMock },
          { provide: OperationsProvider, useClass: OperationsServiceMock },
          { provide: InteractionService, useClass: InteractionServiceMock },
          ClipboardService,
          {
            provide: ActivatedRoute,
            useValue: routeInfo
          },
          AmountConverterPipe
        ],
        declarations: [TransactionPreparePage]
      })
    )
      .compileComponents()
      .catch(console.error)
  })
  beforeEach(async () => {
    ethWallet.addresses = await ethWallet.deriveAddresses(1)
    fixture = TestBed.createComponent(TransactionPreparePage)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should be created', () => {
    expect(component instanceof TransactionPreparePage).toBe(true)
  })

  // // TODO: REENABLE
  // it('should select the correct default fee, and low/medium/high fees', done => {
  //   const element = fixture.debugElement.nativeElement
  //   const feeAmount = element.querySelector('#fee-amount')
  //   const feeAmountAdvanced = element.querySelector('#fee-amount-advanced')

  //   component.setWallet(ethWallet)
  //   expect(component.transactionForm.value.fee).toEqual(
  //     new BigNumber(ethWallet.protocol.feeDefaults.low).toFixed(-1 * new BigNumber(ethWallet.protocol.feeDefaults.low).e + 1)
  //   )

  //   fixture.detectChanges()

  //   // check if fee gets properly displayed in $
  //   expect(feeAmount.textContent.trim()).toEqual('$0.021')
  //   expect(feeAmountAdvanced.textContent.trim()).toEqual('(0.00021 ETH)')

  //   // check if fee changes if set to medium
  //   component.transactionForm.controls['feeLevel'].setValue(1)
  //   expect(component.transactionForm.value.fee).toEqual(
  //     new BigNumber(ethWallet.protocol.feeDefaults.low).toFixed(-1 * new BigNumber(ethWallet.protocol.feeDefaults.low).e + 1)
  //   )
  //   expect(feeAmount.textContent.trim()).toEqual('$0.021')
  //   expect(feeAmountAdvanced.textContent.trim()).toEqual('(0.00021 ETH)')

  //   // check if fee changes if set to high
  //   component.transactionForm.controls['feeLevel'].setValue(2)
  //   expect(component.transactionForm.value.fee).toEqual(
  //     new BigNumber(ethWallet.protocol.feeDefaults.low).toFixed(-1 * new BigNumber(ethWallet.protocol.feeDefaults.low).e + 1)
  //   )
  //   expect(feeAmount.textContent.trim()).toEqual('$0.021')
  //   expect(feeAmountAdvanced.textContent.trim()).toEqual('(0.00021 ETH)')

  //   done()
  // })

  // // TODO: REENABLE
  // it('should properly display $ amount of a fee', () => {
  //   const el = fixture.debugElement.nativeElement
  //   const feeAmount = el.querySelector('#fee-amount')
  //   const feeAmountAdvanced = el.querySelector('#fee-amount-advanced')
  //   component.setWallet(ethWallet)
  //   expect(feeAmount.textContent.trim()).toEqual('$0.021')
  //   expect(feeAmountAdvanced.textContent.trim()).toEqual('(0.00021 ETH)')
  // })

  it('should only give an error if the amount has more than the allowed digits', () => {
    component.wallet = ethWallet
    const validAmounts = [19, 108, 4.345234523452345, 0.0000000000000001, 0.0000000000000001]
    validAmounts.forEach((validAmount) => {
      component.transactionForm.controls.amount.setValue(validAmount)
      fixture.detectChanges()

      expect(fixture.componentInstance.transactionForm.controls.amount.valid).toBe(true)
    })

    const invalidAmounts = [0.0000000000000000001, -1.24]
    invalidAmounts.forEach((invalidAmount) => {
      component.wallet = ethWallet
      component.transactionForm.controls.amount.setValue(invalidAmount)
      fixture.detectChanges()

      expect(fixture.componentInstance.transactionForm.controls.amount.valid).toBe(false)
    })
  })

  it('should create a toast "insufficient balance" if fee + amount is > wallet value', async () => {
    // TODO: Move this test to "operationsProvider"
    spyOn((component as any).router, 'navigateByUrl').and.returnValue(Promise.resolve(true))

    component.transactionForm.controls.receiver.setValue(ethWallet.addresses[0])
    component.transactionForm.controls.amount.setValue(10)
    component.transactionForm.controls.fee.setValue(10)

    await component.prepareTransaction()
    expect((component as any).operationsProvider.prepareTransaction).toHaveBeenCalledTimes(1)
    expect((component as any).operationsProvider.prepareTransaction).toHaveBeenCalledTimes(1)

    /*
    // should create a loadingCtrl
    expect((component as any).loadingCtrl.create).toHaveBeenCalled()

    // should create a toastCtrl
    expect(unitHelper.mockRefs.toastController.create).toHaveBeenCalledWith({
      message: new Error('not enough balance'),
      duration: 3000,
      position: 'bottom'
    })
    */
  })
})
