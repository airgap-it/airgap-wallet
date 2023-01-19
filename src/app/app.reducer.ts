import { createReducer, on } from '@ngrx/store'
import BigNumber from 'bignumber.js'
import * as actions from './app.actions'

export interface State {
  selectedSlippage: BigNumber
}

export const initialState: State = {
  selectedSlippage: new BigNumber(0.005)
}

export const reducer = createReducer(
  initialState,
  on(actions.setSlippage, (state, { slippage }) => ({
    ...state,
    selectedSlippage: slippage
  }))
)
