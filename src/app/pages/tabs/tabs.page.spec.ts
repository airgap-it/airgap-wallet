import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ModalController } from '@ionic/angular'

import { UnitHelper } from '../../../../test-config/unit-test-helper'

import { TabsPage } from './tabs.page'

describe('TabsPage', () => {
  let component: TabsPage
  let fixture: ComponentFixture<TabsPage>

  let unitHelper: UnitHelper
  beforeEach(() => {
    unitHelper = new UnitHelper()
    TestBed.configureTestingModule(
      unitHelper.testBed({
        providers: [{ provide: ModalController, useValue: unitHelper.mockRefs.modalController }],
        declarations: [TabsPage]
      })
    )
      .compileComponents()
      .catch(console.error)
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsPage)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
