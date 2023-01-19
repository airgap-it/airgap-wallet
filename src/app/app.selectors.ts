import { createSelector } from '@ngrx/store'
import { selectApp } from '../app/app.reducers'
export const getSelectedSlippage = createSelector(selectApp, (state) => state.selectedSlippage)
