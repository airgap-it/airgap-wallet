import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { AmountComponent } from './amount.component'

describe('AmountComponent', () => {
  let component: AmountComponent
  let fixture: ComponentFixture<AmountComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AmountComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AmountComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
