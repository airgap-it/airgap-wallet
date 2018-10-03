import { async, TestBed, ComponentFixture } from '@angular/core/testing'
import { HttpClient, HttpClientModule } from '@angular/common/http'
import { IonicModule, NavController, NavParams, Platform, LoadingController, ToastController } from 'ionic-angular'
import { TransactionPreparePage } from './transaction-prepare'
import { StatusBar } from '@ionic-native/status-bar'
import { SplashScreen } from '@ionic-native/splash-screen'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { Keyboard } from '@ionic-native/keyboard'
import BigNumber from 'bignumber.js'

import { PlatformMock, StatusBarMock, SplashScreenMock, NavParamsMock, NavMock } from '../../../test-config/mocks-ionic'
import { NavControllerMock, KeyboardMock, LoadingControllerMock, ToastControllerMock } from 'ionic-mocks'

import { ComponentsModule } from '../../components/components.module'
import { WalletsProvider } from '../../providers/wallets/wallets.provider'
import { WalletMock } from '../../../test-config/wallet-mock'
import { StorageMock } from '../../../test-config/storage-mock'
import { Storage } from '@ionic/storage'
import { PipesModule } from '../../pipes/pipes.module'
import { TransactionQrPage } from '../transaction-qr/transaction-qr'
import { Transaction } from '../../models/transaction.model'

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json')
}

describe('TransactionSigned Page', () => {
  const ethWallet = new WalletMock().ethWallet
  const ethTransaction = new WalletMock().ethTransaction

  const btcWallet = new WalletMock().btcWallet
  const btcTransaction = new WalletMock().btcTransaction

  let fixture: ComponentFixture<TransactionPreparePage>
  let component: TransactionPreparePage

  beforeEach(async(() => {
    WalletMock.injectSecret()
    NavParamsMock.setParams({
      transaction: ethTransaction,
      wallet: ethWallet
    })
    TestBed.configureTestingModule({
      declarations: [TransactionPreparePage],
      imports: [
        IonicModule.forRoot(TransactionPreparePage),
        ComponentsModule,
        PipesModule,
        HttpClientModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient]
          }
        })
      ],
      providers: [
        WalletsProvider,
        { provide: Storage, useClass: StorageMock },
        { provide: NavController, useFactory: () => NavControllerMock.instance() },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: StatusBar, useClass: StatusBarMock },
        { provide: LoadingController, useFactory: () => LoadingControllerMock.instance() },
        { provide: ToastController, useFactory: () => ToastControllerMock.instance() },
        { provide: SplashScreen, useClass: SplashScreenMock },
        { provide: Platform, useClass: PlatformMock },
        { provide: Keyboard, useClass: KeyboardMock }
      ]
    })
  }))

  beforeEach(() => {
    ethWallet.addresses = ethWallet.deriveAddresses(1)
    fixture = TestBed.createComponent(TransactionPreparePage)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should be created', () => {
    expect(component instanceof TransactionPreparePage).toBe(true)
  })

  it('should select the correct default fee, and low/medium/high fees', done => {
    let el = fixture.debugElement.nativeElement
    let feeAmount = el.querySelector('#fee-amount')

    component.useWallet(ethWallet)
    expect(component.fee).toEqual(ethWallet.coinProtocol.feeDefaults.low.toFixed(-1 * ethWallet.coinProtocol.feeDefaults.low.e + 1))

    fixture.detectChanges()

    // check if fee gets properly displayed in $
    expect(feeAmount.textContent).toEqual('0.021')

    // check if fee changes if set to medium
    component.transactionForm.controls['feeLevel'].setValue(1)
    expect(component.fee).toEqual(ethWallet.coinProtocol.feeDefaults.medium.toFixed(-1 * ethWallet.coinProtocol.feeDefaults.low.e + 1))
    expect(feeAmount.textContent).toEqual('0.021')

    // check if fee changes if set to high
    component.transactionForm.controls['feeLevel'].setValue(2)
    expect(component.fee).toEqual(ethWallet.coinProtocol.feeDefaults.high.toFixed(-1 * ethWallet.coinProtocol.feeDefaults.low.e + 1))
    expect(feeAmount.textContent).toEqual('0.021')

    done()
  })

  it('should properly display $ amount of a fee', () => {
    let el = fixture.debugElement.nativeElement
    let feeAmount = el.querySelector('#fee-amount')

    component.useWallet(ethWallet)
    expect(feeAmount.textContent).toEqual('0.021')
  })

  it('should create a correct transaction', async () => {
    expect(component.transactionForm.valid).toBe(false)
    component.transactionForm.controls['address'].setValue(ethWallet.addresses[0])
    component.transactionForm.controls['amount'].setValue(0)
    component.transactionForm.controls['fee'].setValue(0) // set a unrealistic 0 fee to work with mock
    expect(component.transactionForm.valid).toBe(true)

    await component.prepareTransaction(component.transactionForm.value)

    // should create a loadingCtrl
    expect((component as any).loadingCtrl.create).toHaveBeenCalled()

    // should push to the next page
    expect((component as any).navController.push).toHaveBeenCalledWith(TransactionQrPage, {
      wallet: component.wallet,
      transaction: new Transaction(
        [ethWallet.receivingPublicAddress],
        [ethWallet.receivingPublicAddress],
        new BigNumber(0),
        new BigNumber(0),
        ethWallet.protocolIdentifier
      ),
      data:
        'airgap-vault://sign?data=' +
        window.btoa(
          '{"protocolIdentifier":"eth","publicKey":"03ea568e601e6e949a3e5c60e0f4ee94383e4b083c5ab64b66e70372df008cbbe6","payload":{"nonce":0,"gasLimit":21000,"gasPrice":"0","to":"0x4681Df42ca7d5f0E986FFeA979A55c333f5c0a05","from":"0x4681Df42ca7d5f0E986FFeA979A55c333f5c0a05","value":"0","chainId":1}}'
        )
    })
  })

  it('should create a toast "insufficient balance" if fee + amount is > wallet value', async () => {
    component.transactionForm.controls['address'].setValue(ethWallet.addresses[0])
    component.transactionForm.controls['amount'].setValue(10)
    component.transactionForm.controls['fee'].setValue(10)

    await component.prepareTransaction(component.transactionForm.value)

    // should create a loadingCtrl
    expect((component as any).loadingCtrl.create).toHaveBeenCalled()

    // should create a toastCtrl
    expect((component as any).toastController.create).toHaveBeenCalledWith({
      message: 'not enough balance',
      duration: 3000,
      position: 'bottom'
    })
  })
})
