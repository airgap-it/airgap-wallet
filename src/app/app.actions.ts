import { createAction, props } from '@ngrx/store'
import BigNumber from '@airgap/coinlib-core/dependencies/src/bignumber.js-9.0.0/bignumber'

const featureName = 'App'
export const setSlippage = createAction(`[${featureName}] Set Slippage`, props<{ slippage: BigNumber }>())
