import { Component, Input } from '@angular/core'
import { AlertController, ModalController } from '@ionic/angular'
import { AirGapMarketWallet, ICoinProtocol } from '@airgap/coinlib-core'
import { ProtocolSymbols } from '@airgap/coinlib-core'
import { BigNumber } from 'bignumber.js'
import { Observable, Subject } from 'rxjs'
import * as fromExchange from '../../pages/exchange/reducer'
import { Store } from '@ngrx/store'
import { getSelectedSlippage } from 'src/app/app.selectors'
import { FormControl } from '@angular/forms'

@Component({
  selector: 'remove-liquidity',
  templateUrl: 'remove-liquidity.component.html',
  styleUrls: ['./remove-liquidity.component.scss']
})
export class RemoveLiquidityComponent {
  @Input()
  public readonly currentlyNotSupported: boolean = false

  @Input()
  public amountControl: FormControl

  @Input()
  public readonly swapSell: boolean = true

  @Input()
  public readonly selectedWallet: AirGapMarketWallet

  @Input()
  public readonly supportedWallets: AirGapMarketWallet[]

  @Input()
  public readonly selectedProtocol: ICoinProtocol

  @Input()
  public readonly supportedProtocols: ProtocolSymbols[] = []

  @Input()
  public readonly minExchangeAmount: BigNumber

  @Input()
  public amount: BigNumber

  @Input()
  public customBalance: BigNumber

  @Input()
  public customSymbol: string

  private readonly ngDestroyed$: Subject<void> = new Subject()
  public minCurrencyLiquidated$: Observable<BigNumber>
  public minTokensLiquidated$: Observable<BigNumber>
  public expandWalletSelection: boolean = false
  public selectedSlippage$: Observable<BigNumber>

  constructor(
    public alertCtrl: AlertController,
    public modalController: ModalController,
    private readonly store$: Store<fromExchange.State>
  ) {
    this.selectedSlippage$ = this.store$.select(getSelectedSlippage)
    this.minCurrencyLiquidated$ = this.store$.select((state) => state.exchange.minCurrencyLiquidated)
    this.minTokensLiquidated$ = this.store$.select((state) => state.exchange.minTokensLiquidated)
  }

  public ngOnDestroy(): void {
    this.ngDestroyed$.next()
    this.ngDestroyed$.complete()
  }
}
