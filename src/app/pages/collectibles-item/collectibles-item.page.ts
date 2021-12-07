import { BaseComponent, UIResourceStatus } from '@airgap/angular-core'
import { Component, Inject } from '@angular/core'

import { CollectiblesItemFacade, CollectiblesItemNgRxFacade, COLLECTIBLES_ITEM_FACADE } from './collectibles-item.facade'
import { CollectiblesItem } from './collectibles-item.types'

@Component({
  selector: 'page-collectibles-item',
  templateUrl: './collectibles-item.page.html',
  styleUrls: ['./collectibles-item.page.scss'],
  providers: [{ provide: COLLECTIBLES_ITEM_FACADE, useClass: CollectiblesItemNgRxFacade }]
})
export class CollectiblesItemPage extends BaseComponent<CollectiblesItemFacade> {
  public readonly UIResourceStatus: typeof UIResourceStatus = UIResourceStatus

  constructor(@Inject(COLLECTIBLES_ITEM_FACADE) facade: CollectiblesItemFacade) {
    super(facade)
  }

  public send(item: CollectiblesItem): void {
    this.facade.send(item)
  }

  public openUrl(url: string): void {
    this.facade.openUrl(url)
  }

  public onImgInvalid(): void {
    this.facade.onImgInvalid()
  }
}
