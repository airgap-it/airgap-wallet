import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { DelegateEditPopoverComponent } from './delegate-edit-popover.component'

describe('DelegateEditPopoverComponent', () => {
  let component: DelegateEditPopoverComponent
  let fixture: ComponentFixture<DelegateEditPopoverComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DelegateEditPopoverComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(DelegateEditPopoverComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
