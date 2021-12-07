import { assertNever, BaseFacade, UIAction, UiEventService, UIResource } from '@airgap/angular-core'
import { BaseNgRxFacade, FacadeTypes } from '@airgap/angular-ngrx'
import { Injectable, InjectionToken } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { ToastOptions } from '@ionic/core'
import { Store } from '@ngrx/store'
import { Observable } from 'rxjs'
import { takeUntil } from 'rxjs/operators'

import * as actions from './collectibles-item.actions'
import * as fromCollectiblesItem from './collectibles-item.reducers'
import { CollectiblesItem, Toast } from './collectibles-item.types'

export const COLLECTIBLES_ITEM_FACADE = new InjectionToken<CollectiblesItemFacade>('CollectiblesItemFacade')
export type CollectiblesItemFacade<T extends BaseFacade = BaseFacade> = ICollectiblesItemFacade & T
export interface ICollectiblesItemFacade {
  readonly item$: Observable<UIResource<CollectiblesItem>>

  send(item: CollectiblesItem): void
  openUrl(url: string): void

  onImgInvalid(): void
}

interface Types extends FacadeTypes {
  Toast: Toast
}
@Injectable()
export class CollectiblesItemNgRxFacade extends BaseNgRxFacade<Store<fromCollectiblesItem.State>, Types>
  implements ICollectiblesItemFacade {
  public readonly item$: Observable<UIResource<CollectiblesItem>>

  private readonly toast$: Observable<UIAction<Toast>>

  public constructor(store: Store<fromCollectiblesItem.State>, private readonly route: ActivatedRoute, uiEventService: UiEventService) {
    super(store, uiEventService)
    this.item$ = this.store.select(fromCollectiblesItem.selectItem)
    this.toast$ = this.store.select(fromCollectiblesItem.selectToast)

    this.toast$.pipe(takeUntil(this.viewDestroyed$)).subscribe(this.showOrHideToast.bind(this))
  }

  public onViewCreate(): never {
    this.store.dispatch(actions.viewReload({ routeSnapshot: this.route.snapshot }))

    return super.onViewCreate()
  }
  public send(item: CollectiblesItem): void {
    this.store.dispatch(actions.send({ item }))
  }

  public openUrl(url: string): void {
    this.store.dispatch(actions.openUrl({ url }))
  }

  public onImgInvalid(): void {
    this.store.dispatch(actions.invalidImg())
  }

  protected onToastDismissed(toast: UIAction<Toast>): void {
    this.store.dispatch(actions.toastDismissed({ id: toast.id }))
  }

  protected getToastData(toast: Toast): ToastOptions {
    switch (toast.type) {
      case 'loading':
        return this.loadingErrorToast(toast.error)
      case 'openUrl':
        return this.openUrlErrorToast(toast.error)
      case 'send':
        return this.sendErrorToast(toast.error)
      case 'unknown':
        return this.unknownErrorToast(toast.error)
      default:
        assertNever('getToastData', toast.type)
    }
  }

  private loadingErrorToast(_error?: any): ToastOptions {
    return {
      message: 'collectibles-item.error.loading.message'
    }
  }

  private openUrlErrorToast(_error?: any): ToastOptions {
    return {
      message: 'collectibles-item.error.open-url.message'
    }
  }

  private sendErrorToast(_error?: any): ToastOptions {
    return {
      message: 'collectibles-item.error.send.message'
    }
  }

  private unknownErrorToast(_error?: any): ToastOptions {
    return {
      message: 'collectibles-item.error.unknown.message'
    }
  }
}
