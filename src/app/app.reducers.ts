import { InjectionToken } from '@angular/core'
import { Action, ActionReducer, ActionReducerMap, MetaReducer } from '@ngrx/store'
import { environment } from 'src/environments/environment'
import * as fromApp from '../app/app.reducer'
import * as fromExchange from '../app/pages/exchange/reducer'

export interface State {
  app: fromApp.State
}
export const selectApp = (state: State) => state.app

export const reducers = {}

function logger(reducer: ActionReducer<State>): ActionReducer<State> {
  return (state, action) => {
    const newState = reducer(state, action)
    console.groupCollapsed(action.type)
    console.log('previous state', state)
    console.log('action', action)
    console.log('next state', newState)
    console.groupEnd()

    return newState
  }
}
export const metaReducers: MetaReducer<State>[] = !environment.production ? [logger] : []

export const ROOT_REDUCERS = new InjectionToken<ActionReducerMap<State, Action>>('Root reducers token', {
  factory: () => ({
    app: fromApp.reducer,
    exchange: fromExchange.reducer
  })
})
