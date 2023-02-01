import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { createAction, props } from '@ngrx/store'
import BigNumber from 'bignumber.js'
import { SegmentType } from './reducer'

const featureName = 'Exchange'

export const setFromWallet = createAction(`[${featureName}] Set From Wallet`, props<{ fromWallet: AirGapMarketWallet }>())
export const setToWallet = createAction(`[${featureName}] Set To Wallet`, props<{ toWallet: AirGapMarketWallet }>())
export const setAmount = createAction(`[${featureName}] Set Amount`, props<{ amount: BigNumber }>())
export const toggleRemoveLiquidity = createAction(`[${featureName}] Toggle Remove Liquidity`, props<{ bool: boolean }>())
export const setSegment = createAction(`[${featureName}] Set Segment Type`, props<{ segmentType: SegmentType }>())
export const emptyAction = createAction(`[${featureName}] empty action`)

export const loadFromWalletBalance = createAction(`[${featureName}] Load From Wallet Balance`)
export const loadFromWalletBalanceSucceeded = createAction(
  `[${featureName}] Load From Wallet Balance Succeeded`,
  props<{ balance: BigNumber }>()
)

export const loadFiatInputAmount = createAction(`[${featureName}] Load Fiat Input Amount`)
export const loadFiatInputAmountSucceeded = createAction(
  `[${featureName}] Load Fiat Input Amount Succeeded`,
  props<{ fiatInputAmount: BigNumber }>()
)

export const loadFiatExchangeAmount = createAction(`[${featureName}] Load Fiat Exchange Amount`)
export const loadFiatExchangeAmountSucceeded = createAction(
  `[${featureName}] Load Fiat Exchange Amount Succeeded`,
  props<{ fiatExchangeAmount: BigNumber }>()
)

export const loadToWalletBalance = createAction(`[${featureName}] Load To Wallet Balance`)
export const loadToWalletBalanceSucceeded = createAction(
  `[${featureName}] Load To Wallet Balance Succeeded`,
  props<{ balance: BigNumber }>()
)

export const loadExchangeData = createAction(`[${featureName}] Load Exchange Data`, props<{ amount: BigNumber }>())
export const loadExchangeAmountSucceeded = createAction(
  `[${featureName}] Load Exchange Amount Succeeded`,
  props<{ exchangeAmount: BigNumber }>()
)

export const loadMinExchangeAmount = createAction(`[${featureName}] Load Min Exchange Amount`)
export const loadMinExchangeAmountSucceeded = createAction(
  `[${featureName}] Load Min Exchange Amount Succeeded`,
  props<{ minExchangeAmount: BigNumber }>()
)

export const loadExchangeDataFailed = createAction(`[${featureName}] Load Exchange Data Failed`, props<{ error: any }>())

export const loadRemoveLiquidityData = createAction(`[${featureName}] Load Remove Liquidity Data`)
export const loadRemoveLiquidityDataSucceeded = createAction(
  `[${featureName}] Load Min Currency Liquidated Succeeded`,
  props<{ minCurrencyLiquidated: BigNumber; minTokensLiquidated: BigNumber }>()
)

export const loadRemoveLiquidityBalance = createAction(`[${featureName}] Load Remove Liquidity Balance`)
export const loadRemoveLiquidityBalanceSucceeded = createAction(
  `[${featureName}] Load Remove Liquidity Balance Succeeded`,
  props<{ removeLiquidityBalance }>()
)

export const checkButtonDisabledSwap = createAction(`[${featureName}] Check Swap State `)
export const checkButtonDisabledAddLiquidity = createAction(`[${featureName}] Check Add Liquidity State`)
export const checkButtonDisabledRemoveLiquidity = createAction(`[${featureName}] Check Remove Liquidity State`)
export const setButtonDisabled = createAction(`[${featureName}] Set Button State`, props<{ buttonDisabled: boolean }>())
