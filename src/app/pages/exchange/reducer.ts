import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { createReducer, on } from '@ngrx/store'
import BigNumber from 'bignumber.js'
import * as fromRoot from '../../app.reducers'
import * as actions from './actions'

export enum SegmentType {
  SWAP = 'swap',
  ADD_LIQUIDITY = 'addLiquidity',
  REMOVE_LIQUIDITY = 'removeLiquidity'
}

/**************** State ****************/

export interface ExchangeState {
  fromWallet: AirGapMarketWallet
  toWallet: AirGapMarketWallet
  fromWalletBalance: BigNumber
  toWalletBalance: BigNumber
  amount: BigNumber
  fiatInputAmount: BigNumber
  fiatExchangeAmount: BigNumber
  exchangeAmount: BigNumber
  minExchangeAmount: BigNumber
  currentlyNotSupported: boolean
  removeLiquidityBalance: BigNumber
  minCurrencyLiquidated: BigNumber
  minTokensLiquidated: BigNumber
  segmentType: SegmentType
  buttonDisabled: boolean
}

export interface State extends fromRoot.State {
  exchange: ExchangeState
}

export const selectExchange = (state: State) => state.exchange

/**************** Reducers ****************/

export const initialState: ExchangeState = {
  fromWallet: null,
  toWallet: null,
  fromWalletBalance: new BigNumber(0),
  amount: new BigNumber(0),
  fiatInputAmount: new BigNumber(0),
  fiatExchangeAmount: new BigNumber(0),
  toWalletBalance: new BigNumber(0),
  exchangeAmount: new BigNumber(0),
  minExchangeAmount: new BigNumber(0),
  currentlyNotSupported: false,
  removeLiquidityBalance: new BigNumber(0),
  minCurrencyLiquidated: new BigNumber(0),
  minTokensLiquidated: new BigNumber(0),
  segmentType: SegmentType.SWAP,
  buttonDisabled: true
}

export const reducer = createReducer(
  initialState,
  on(actions.setFromWallet, (state, { fromWallet }) => ({
    ...state,
    fromWallet,
    currentlyNotSupported: false
  })),
  on(actions.setToWallet, (state, { toWallet }) => ({
    ...state,
    toWallet,
    currentlyNotSupported: false
  })),
  on(actions.loadFromWalletBalanceSucceeded, (state, { balance }) => ({
    ...state,
    fromWalletBalance: balance
  })),
  on(actions.loadFiatInputAmountSucceeded, (state, { fiatInputAmount }) => ({
    ...state,
    fiatInputAmount
  })),
  on(actions.loadFiatExchangeAmountSucceeded, (state, { fiatExchangeAmount }) => ({
    ...state,
    fiatExchangeAmount
  })),
  on(actions.loadToWalletBalanceSucceeded, (state, { balance }) => ({
    ...state,
    toWalletBalance: balance
  })),
  on(actions.setAmount, (state, { amount }) => ({
    ...state,
    amount
  })),
  on(actions.loadExchangeAmountSucceeded, (state, { exchangeAmount }) => ({
    ...state,
    exchangeAmount
  })),
  on(actions.loadMinExchangeAmountSucceeded, (state, { minExchangeAmount }) => ({
    ...state,
    minExchangeAmount
  })),
  on(actions.loadExchangeDataFailed, (state, {}) => ({
    ...state,
    currentlyNotSupported: true
  })),
  on(actions.loadRemoveLiquidityDataSucceeded, (state, { minCurrencyLiquidated, minTokensLiquidated }) => ({
    ...state,
    minCurrencyLiquidated,
    minTokensLiquidated
  })),
  on(actions.loadRemoveLiquidityBalanceSucceeded, (state, { removeLiquidityBalance }) => ({
    ...state,
    removeLiquidityBalance
  })),
  on(actions.setSegment, (state, { segmentType }) => ({
    ...state,
    segmentType
  })),
  on(actions.setButtonDisabled, (state, { buttonDisabled }) => ({
    ...state,
    buttonDisabled: buttonDisabled || state.currentlyNotSupported
  }))
)
