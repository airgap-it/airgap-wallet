import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Router } from '@angular/router'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { Action, Store } from '@ngrx/store'
import { concat, from, MonoTypeOperatorFunction, of } from 'rxjs'
import { concatMap, first, switchMap, tap, withLatestFrom } from 'rxjs/operators'

import { AccountProvider } from '../../services/account/account.provider'
import { BrowserService } from '../../services/browser/browser.service'
import { CollectiblesService } from '../../services/collectibles/collectibles.service'
import { DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

import * as actions from './collectibles-item.actions'
import * as fromCollectiblesItem from './collectibles-item.reducers'
import { CollectiblesItem } from './collectibles-item.types'

@Injectable()
export class CollectiblesItemEffects {
  public viewReload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.viewReload),
      concatMap((action) => of(this.readRouteParams(action.routeSnapshot)))
    )
  )

  public readRouteParams$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.routeParamsRead),
      concatMap((action) => of(actions.loadDetails({ collectibleAddress: action.collectibleAddress, collectibleId: action.collectibleId })))
    )
  )

  public loadDetails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.loadDetails),
      withLatestFrom(this.store.select(fromCollectiblesItem.selectWallet(this.accountProvider, this.wallet)).pipe(this.cacheWallet())),
      switchMap(([action, wallet]) =>
        concat(
          of(actions.detailsLoading()),
          from(this.loadCollectibleDetails(wallet, action.collectibleAddress, action.collectibleId)).pipe(first())
        )
      )
    )
  )

  public send$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.send),
      withLatestFrom(this.store.select(fromCollectiblesItem.selectWallet(this.accountProvider, this.wallet)).pipe(this.cacheWallet())),
      switchMap(([action, wallet]) => this.send(wallet, action.item))
    )
  )

  public openUrl$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.openUrl),
      switchMap((action) => this.openUrl(action.url))
    )
  )

  public handled$ = createEffect(() => this.actions$.pipe(ofType(actions.handled)), { dispatch: false })

  private wallet: AirGapMarketWallet | undefined

  public constructor(
    private readonly actions$: Actions,
    private readonly store: Store<fromCollectiblesItem.State>,
    private readonly router: Router,
    private readonly accountProvider: AccountProvider,
    private readonly collectiblesService: CollectiblesService,
    private readonly browserService: BrowserService
  ) {}

  private readRouteParams(routeSnapshot: ActivatedRouteSnapshot): Action {
    const publicKey = routeSnapshot.params.publicKey
    const protocolIdentifier = routeSnapshot.params.protocolID
    let addressIndex = parseInt(routeSnapshot.params.addressIndex, 10)
    if (isNaN(addressIndex)) {
      addressIndex = undefined
    }
    const [collectibleAddress, collectibleId] = routeSnapshot.params.collectible?.split(':')

    return actions.routeParamsRead({ publicKey, addressIndex, protocolIdentifier, collectibleAddress, collectibleId })
  }

  private async loadCollectibleDetails(
    wallet: AirGapMarketWallet | undefined,
    collectibleAddress: string,
    collectibleId: string
  ): Promise<Action> {
    try {
      if (wallet === undefined) {
        throw new Error('Could not find a wallet')
      }

      const collectible = await this.collectiblesService.getCollectibleDetails(wallet, collectibleAddress, collectibleId)

      return actions.detailsLoadingSuccess({ collectible })
    } catch (error) {
      // tslint:disable-next-line: no-console
      console.error(error)
      handleErrorSentry(ErrorCategory.OTHER)(error)

      return actions.detailsLoadingFailure({ error })
    }
  }

  private async send(wallet: AirGapMarketWallet | undefined, item: CollectiblesItem): Promise<Action> {
    try {
      const collectibleWallet = wallet ? await this.collectiblesService.getCollectibleWallet(wallet, item.collectibleDetails) : undefined
      if (collectibleWallet === undefined) {
        throw new Error('Could not find a wallet')
      }

      await this.router.navigateByUrl(
        `/transaction-prepare/${DataServiceKey.DETAIL}/${collectibleWallet.publicKey}/${collectibleWallet.protocol.identifier}/${
          collectibleWallet.addressIndex
        }/false/${item.amount ?? 0}/${item.id}/${'not_forced'}`
      )

      return actions.handled()
    } catch (error) {
      handleErrorSentry(ErrorCategory.NAVIGATION)(error)

      return actions.sendFailure({ error })
    }
  }

  private async openUrl(url: string): Promise<Action> {
    try {
      await this.browserService.openUrl(url)

      return actions.handled()
    } catch (error) {
      handleErrorSentry(ErrorCategory.OTHER)(error)

      return actions.openUrlFailure({ error })
    }
  }

  private cacheWallet(): MonoTypeOperatorFunction<AirGapMarketWallet> {
    return tap((wallet: AirGapMarketWallet | undefined) => {
      this.wallet = wallet
    })
  }
}
