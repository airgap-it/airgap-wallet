import { Injectable } from '@angular/core'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { catchError, filter, map, switchMap, withLatestFrom } from 'rxjs/operators'
import * as actions from './actions'
import * as fromExchange from './reducer'
import { Store } from '@ngrx/store'
import BigNumber from 'bignumber.js'
import { ExchangeProvider } from 'src/app/services/exchange/exchange'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { from, Observable, of, OperatorFunction, pipe, UnaryFunction } from 'rxjs'
import { SegmentType } from './reducer'

export function filterNullish<T>(): UnaryFunction<Observable<T | null | undefined>, Observable<T>> {
  return pipe(filter((x) => x != null) as OperatorFunction<T | null | undefined, T>)
}

@Injectable()
export class ExchangeEffects {
  onSetFromWalletLoadBalance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.setFromWallet),
      map(() => actions.loadFromWalletBalance())
    )
  )

  onSetToWalletLoadBalance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.setToWallet),
      map(() => actions.loadToWalletBalance())
    )
  )

  onSetFromWalletLoadFiatInputAmount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.setFromWallet),
      map(() => actions.loadFiatInputAmount())
    )
  )

  onLoadExchangeAmountSucceededLoadFiatExchangeAmount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadExchangeAmountSucceeded),
      map(() => actions.loadFiatExchangeAmount())
    )
  )

  onLoadExchangeAmountSucceededCheckLiquidityButton$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadExchangeAmountSucceeded),
      withLatestFrom(this.store$.select((state) => state.exchange.segmentType)),
      map(([_, segmentType]) => {
        if (segmentType === SegmentType.ADD_LIQUIDITY) {
          return actions.checkButtonDisabledAddLiquidity()
        } else if (segmentType === SegmentType.REMOVE_LIQUIDITY) {
          return actions.checkButtonDisabledRemoveLiquidity()
        }
        return actions.emptyAction()
      })
    )
  )
  onSetAmount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.setAmount),
      withLatestFrom(this.store$.select((state) => state.exchange.segmentType)),
      map(([_, segmentType]) => {
        if (segmentType === SegmentType.REMOVE_LIQUIDITY) {
          return actions.loadRemoveLiquidityData()
        }
        return actions.emptyAction()
      })
    )
  )

  onSetAmountCheckButtonDisabled$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.setAmount),
      withLatestFrom(this.store$.select((state) => state.exchange.segmentType)),
      map(([_, segmentType]) => {
        if (segmentType === SegmentType.SWAP) {
          return actions.checkButtonDisabledSwap()
        }
        return actions.emptyAction()
      })
    )
  )

  setButtonDisabledSwap$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.checkButtonDisabledSwap),
      withLatestFrom(
        this.store$.select((state) => state.exchange.amount),
        this.store$.select((state) => state.exchange.minExchangeAmount),
        this.store$.select((state) => state.exchange.fromWallet)
      ),

      map(([_, amount, minExchangeAmount, fromWallet]) => {
        const buttonDisabled =
          amount.isNaN() ||
          amount.isZero() ||
          amount.isLessThan(minExchangeAmount) ||
          amount.isGreaterThan(new BigNumber(fromWallet.getCurrentBalance()).shiftedBy(-1 * fromWallet.protocol.decimals))
        return actions.setButtonDisabled({ buttonDisabled })
      })
    )
  )

  setButtonDisabledAddLiquidity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.checkButtonDisabledAddLiquidity),
      withLatestFrom(
        this.store$.select((state) => state.exchange.amount),
        this.store$.select((state) => state.exchange.minExchangeAmount),
        this.store$.select((state) => state.exchange.exchangeAmount),
        this.store$.select((state) => state.exchange.fromWallet),
        this.store$.select((state) => state.exchange.toWallet)
      ),
      map(([_, amount, minExchangeAmount, exchangeAmount, fromWallet, toWallet]) => {
        const buttonDisabled =
          amount.isNaN() ||
          amount.isZero() ||
          amount.isLessThan(minExchangeAmount) ||
          amount.isGreaterThan(new BigNumber(fromWallet?.getCurrentBalance()).shiftedBy(-1 * fromWallet?.protocol.decimals)) ||
          exchangeAmount.isGreaterThan(new BigNumber(toWallet?.getCurrentBalance()).shiftedBy(-1 * toWallet?.protocol.decimals))
        return actions.setButtonDisabled({ buttonDisabled })
      })
    )
  )

  setButtonDisabledRemoveLiquidity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.checkButtonDisabledRemoveLiquidity),
      withLatestFrom(
        this.store$.select((state) => state.exchange.amount),
        this.store$.select((state) => state.exchange.removeLiquidityBalance),
        this.store$.select((state) => state.exchange.fromWallet)
      ),
      map(([_, amount, removeLiquidityBalance, fromWallet]) => {
        const buttonDisabled =
          amount.isNaN() || amount.isZero() || amount.isGreaterThan(removeLiquidityBalance.shiftedBy(-1 * fromWallet.protocol.decimals))
        return actions.setButtonDisabled({ buttonDisabled })
      })
    )
  )

  loadFromWalletBalance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadFromWalletBalance),
      withLatestFrom(this.store$.select((state) => state.exchange.fromWallet)),
      filterNullish(),
      map(([_action, wallet]) => {
        const balance = wallet?.getCurrentBalance()
        return actions.loadFromWalletBalanceSucceeded({ balance })
      })
    )
  )

  loadToWalletBalance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadToWalletBalance),
      withLatestFrom(this.store$.select((state) => state.exchange.toWallet)),
      filterNullish(),
      map(([_action, wallet]) => {
        const balance = wallet?.getCurrentBalance()
        return actions.loadToWalletBalanceSucceeded({ balance })
      })
    )
  )

  loadExchangeData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadExchangeData),
      withLatestFrom(
        this.store$.select((state) => state.exchange.fromWallet),
        this.store$.select((state) => state.exchange.toWallet)
      ),
      switchMap(([{ amount }, fromWallet, toWallet]) => {
        if (fromWallet && toWallet && amount?.isGreaterThan(0)) {
          return from(this.getExchangeAmount(fromWallet, toWallet, amount)).pipe(
            map((exchangeAmount) => {
              return actions.loadExchangeAmountSucceeded({ exchangeAmount })
            }),
            catchError((error) => of(actions.loadExchangeDataFailed({ error })))
          )
        } else {
          return of(actions.loadExchangeAmountSucceeded({ exchangeAmount: new BigNumber(0) }))
        }
      })
    )
  )

  loadMinExchangeAmount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadExchangeData),
      withLatestFrom(
        this.store$.select((state) => state.exchange.fromWallet),
        this.store$.select((state) => state.exchange.toWallet)
      ),
      switchMap(([{ amount }, fromWallet, toWallet]) => {
        if (fromWallet && toWallet && amount?.isGreaterThan(0)) {
          return from(this.getMinAmountForCurrency(fromWallet, toWallet)).pipe(
            map((minExchangeAmount) => {
              return actions.loadMinExchangeAmountSucceeded({ minExchangeAmount })
            }),
            catchError((error) => of(actions.loadExchangeDataFailed({ error })))
          )
        } else {
          return of(actions.loadMinExchangeAmountSucceeded({ minExchangeAmount: new BigNumber(0) }))
        }
      })
    )
  )

  loadFiatInputAmount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadFiatInputAmount),
      withLatestFrom(
        this.store$.select((state) => state.exchange.amount),
        this.store$.select((state) => state.exchange.fromWallet)
      ),
      map(([_, amount, fromWallet]) => {
        return actions.loadFiatInputAmountSucceeded({
          fiatInputAmount: amount.multipliedBy(fromWallet?.getCurrentMarketPrice() ?? new BigNumber(0))
        })
      })
    )
  )

  loadFiatExchangeAmount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadFiatExchangeAmount),
      withLatestFrom(
        this.store$.select((state) => state.exchange.exchangeAmount),
        this.store$.select((state) => state.exchange.toWallet)
      ),
      map(([_, amount, toWallet]) => {
        return actions.loadFiatExchangeAmountSucceeded({
          fiatExchangeAmount: amount.multipliedBy(toWallet?.getCurrentMarketPrice() ?? new BigNumber(0))
        })
      })
    )
  )

  onSetAmountSetFiatAmount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.setAmount),
      withLatestFrom(this.store$.select((state) => state.exchange.fromWallet)),
      map(([amount, fromWallet]) => {
        return actions.loadFiatInputAmountSucceeded({
          fiatInputAmount: amount.amount.multipliedBy(fromWallet.getCurrentMarketPrice() ?? new BigNumber(0))
        })
      })
    )
  )

  loadRemoveLiquidityBalance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadRemoveLiquidityData),
      switchMap(() => {
        return from(this.exchangeProvider.getCustomData('removeLiquidity')).pipe(
          map((removeLiquidityBalance) => {
            return actions.loadRemoveLiquidityBalanceSucceeded({
              removeLiquidityBalance
            })
          }),
          catchError((error) => of(actions.loadExchangeDataFailed({ error })))
        )
      })
    )
  )
  loadMinCurrencyLiquidated$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadRemoveLiquidityData),
      withLatestFrom(this.store$.select((state) => state.exchange.amount)),
      switchMap(([_, amount]) => {
        return from(this.exchangeProvider.getCustomData(amount)).pipe(
          map((data) => {
            return actions.loadRemoveLiquidityDataSucceeded({
              minCurrencyLiquidated: data[0] as BigNumber,
              minTokensLiquidated: data[1] as BigNumber
            })
          }),
          catchError((error) => of(actions.loadExchangeDataFailed({ error })))
        )
      })
    )
  )

  private async getExchangeAmount(fromWallet: AirGapMarketWallet, toWallet: AirGapMarketWallet, amount: BigNumber): Promise<BigNumber> {
    return new BigNumber(
      await this.exchangeProvider.getExchangeAmount(fromWallet.protocol.identifier, toWallet.protocol.identifier, amount.toString())
    )
  }

  private async getMinAmountForCurrency(fromWallet: AirGapMarketWallet, toWallet: AirGapMarketWallet): Promise<BigNumber> {
    return new BigNumber(await this.exchangeProvider.getMinAmountForCurrency(fromWallet.protocol.identifier, toWallet.protocol.identifier))
  }
  constructor(
    private readonly actions$: Actions,
    private readonly store$: Store<fromExchange.State>,
    private readonly exchangeProvider: ExchangeProvider
  ) {}
}
