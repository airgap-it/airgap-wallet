import { createSelector } from '@ngrx/store'
import { selectExchange } from './reducer'

export const getFromWallet = createSelector(selectExchange, (state) => state.fromWallet)
export const getToWallet = createSelector(selectExchange, (state) => state.toWallet)
