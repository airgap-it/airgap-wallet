import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { DelegationCosmosPage } from './delegation-cosmos.page'

describe('DelegationCosmosPage', () => {
  let component: DelegationCosmosPage
  let fixture: ComponentFixture<DelegationCosmosPage>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DelegationCosmosPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(DelegationCosmosPage)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
