/*
import { async, TestBed, ComponentFixture } from '@angular/core/testing'
import { HttpClient, HttpClientModule } from '@angular/common/http'
import { IonicModule, NavController, NavParams, Platform, LoadingController, ToastController } from '@ionic/angular'
import { AppComponent } from '../../app.component'
import { TransactionPreparePage } from './transaction-prepare'
import { StatusBar } from '@ionic-native/status-bar'
import { SplashScreen } from '@ionic-native/splash-screen'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { Keyboard } from '@ionic-native/keyboard'

import { PlatformMock, StatusBarMock, SplashScreenMock, NavParamsMock } from '../../../../test-config/mocks-ionic'

import { ComponentsModule } from '../../components/components.module'
import { AccountProvider } from '../../services/account/account.provider'
import { WalletMock } from '../../../../test-config/wallet-mock'
import { StorageMock } from '../../../../test-config/storage-mock'
import { Storage } from '@ionic/storage'
import { PipesModule } from '../../pipes/pipes.module'
import { Clipboard } from '@ionic-native/clipboard'
import { ClipboardProvider } from '../../services/clipboard/clipboard'

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json')
}

describe('TransactionPrepare Page', () => {
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
        AccountProvider,
        Clipboard,
        { provide: Storage, useClass: StorageMock },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: StatusBar, useClass: StatusBarMock },
        { provide: SplashScreen, useClass: SplashScreenMock },
        { provide: Platform, useClass: PlatformMock },
        ClipboardProvider
      ]
    })
  }))

  beforeEach(async () => {
    ethWallet.addresses = await ethWallet.deriveAddresses(1)
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
    let feeAmountAdvanced = el.querySelector('#fee-amount-advanced')

    component.useWallet(ethWallet)
    expect(component.transactionForm.value.fee).toEqual(
      ethWallet.coinProtocol.feeDefaults.low.toFixed(-1 * ethWallet.coinProtocol.feeDefaults.low.e + 1)
    )

    fixture.detectChanges()

    // check if fee gets properly displayed in $
    expect(feeAmount.textContent.trim()).toEqual('$0.021')
    expect(feeAmountAdvanced.textContent.trim()).toEqual('(0.00021 ETH)')

    // check if fee changes if set to medium
    component.transactionForm.controls['feeLevel'].setValue(1)
    expect(component.transactionForm.value.fee).toEqual(
      ethWallet.coinProtocol.feeDefaults.medium.toFixed(-1 * ethWallet.coinProtocol.feeDefaults.low.e + 1)
    )
    expect(feeAmount.textContent.trim()).toEqual('$0.021')
    expect(feeAmountAdvanced.textContent.trim()).toEqual('(0.00021 ETH)')

    // check if fee changes if set to high
    component.transactionForm.controls['feeLevel'].setValue(2)
    expect(component.transactionForm.value.fee).toEqual(
      ethWallet.coinProtocol.feeDefaults.high.toFixed(-1 * ethWallet.coinProtocol.feeDefaults.low.e + 1)
    )
    expect(feeAmount.textContent.trim()).toEqual('$0.021')
    expect(feeAmountAdvanced.textContent.trim()).toEqual('(0.00021 ETH)')

    done()
  })

  it('should properly display $ amount of a fee', () => {
    let el = fixture.debugElement.nativeElement
    let feeAmount = el.querySelector('#fee-amount')
    let feeAmountAdvanced = el.querySelector('#fee-amount-advanced')
    component.useWallet(ethWallet)
    expect(feeAmount.textContent.trim()).toEqual('$0.021')
    expect(feeAmountAdvanced.textContent.trim()).toEqual('(0.00021 ETH)')
  })

  it('should create a toast "insufficient balance" if fee + amount is > wallet value', async () => {
    component.transactionForm.controls['address'].setValue(ethWallet.addresses[0])
    component.transactionForm.controls['amount'].setValue(10)
    component.transactionForm.controls['fee'].setValue(10)

    await component.prepareTransaction()

    // should create a loadingCtrl
    expect((component as any).loadingCtrl.create).toHaveBeenCalled()

    // should create a toastCtrl
    expect((component as any).toastController.create).toHaveBeenCalledWith({
      message: new Error('not enough balance'),
      duration: 3000,
      position: 'bottom'
    })
  })
})
*/
