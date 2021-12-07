import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideMockStore } from '@ngrx/store/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { CollectiblesListPage } from './collectibles-list.page'
import * as fromCollectiblesList from './collectibles-list.reducers'

describe('CollectiblesListPage', () => {
  let component: CollectiblesListPage
  let fixture: ComponentFixture<CollectiblesListPage>

  let unitHelper: UnitHelper

  const initialState: fromCollectiblesList.State = {
    collectiblesList: fromCollectiblesList.initialState
  }

  beforeEach(
    waitForAsync(() => {
      unitHelper = new UnitHelper()
      TestBed.configureTestingModule(
        unitHelper.testBed({
          declarations: [CollectiblesListPage],
          providers: [provideMockStore({ initialState })]
        })
      )
        .compileComponents()
        .catch(console.error)

      fixture = TestBed.createComponent(CollectiblesListPage)
      component = fixture.componentInstance
      fixture.detectChanges()
    })
  )

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
