import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideMockStore } from '@ngrx/store/testing'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { CollectiblesItemPage } from './collectibles-item.page'
import * as fromCollectiblesItem from './collectibles-item.reducers'

describe('CollectiblesItemPage', () => {
  let component: CollectiblesItemPage
  let fixture: ComponentFixture<CollectiblesItemPage>

  let unitHelper: UnitHelper

  const initialState: fromCollectiblesItem.State = {
    collectiblesItem: fromCollectiblesItem.initialState
  }

  beforeEach(waitForAsync(() => {
    unitHelper = new UnitHelper()
    TestBed.configureTestingModule(
        unitHelper.testBed({
          declarations: [CollectiblesItemPage],
          providers: [provideMockStore({ initialState })]
        })
      )
        .compileComponents()
        .catch(console.error)

    fixture = TestBed.createComponent(CollectiblesItemPage)
    component = fixture.componentInstance
    fixture.detectChanges()
  }))

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
