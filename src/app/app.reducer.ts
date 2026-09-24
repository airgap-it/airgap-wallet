import { createReducer, on } from '@ngrx/store'
import BigNumber from '@airgap/coinlib-core/dependencies/src/bignumber.js-9.0.0/bignumber'
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
