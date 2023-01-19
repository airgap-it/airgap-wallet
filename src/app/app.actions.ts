import { createAction, props } from '@ngrx/store'
import BigNumber from 'bignumber.js'

const featureName = 'App'
export const setSlippage = createAction(`[${featureName}] Set Slippage`, props<{ slippage: BigNumber }>())
