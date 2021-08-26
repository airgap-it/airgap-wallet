import { Component, Input, OnInit } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'

import { UIOptionButtonGroup } from '../../models/widgets/input/UIOptionButtonGroup'

@Component({
  selector: 'widget-option-button-group',
  templateUrl: 'widget-option-button-group.html',
  styleUrls: ['widget-option-button-group.scss']
})
export class WidgetOptionButtonGroup implements OnInit {
  @Input()
  public widget: UIOptionButtonGroup

  @Input()
  public widgetForm: FormGroup

  public customInputControl: string = 'customInput'

  constructor(private readonly formBuilder: FormBuilder) {}

  public ngOnInit(): void {
    this.setupForm()
  }

  public onSelected(value: string): void {
    this.widgetForm.patchValue({
      [this.widget.id]: value,
      [this.customInputControl]: false
    })
    if (this.widget.onSelected) {
      this.widget.onSelected(value)
    }
  }

  private setupForm(): void {
    this.widgetForm.addControl(this.customInputControl, this.formBuilder.control(false))

    if (this.widget.defaultSelected) {
      this.widgetForm.get(this.widget.id).patchValue(this.widget.defaultSelected)
    }

    this.widgetForm.get(this.customInputControl).valueChanges.subscribe((enabled) => {
      if (enabled && this.widget.customInput) {
        this.emitAuxFormValue()
      } else if (!enabled) {
        this.restoreTargetValue()
      }
    })
  }

  private emitAuxFormValue(): void {
    this.widgetForm.get(this.widget.customInput?.id).updateValueAndValidity()
  }

  private restoreTargetValue(): void {
    const isValidValue: boolean = this.widget.optionButtons.map((button) => button.value).includes(this.widget.value)
    if (isValidValue) {
      return
    }

    this.widgetForm.get(this.widget.id).patchValue(this.widget.defaultSelected ?? this.widget.optionButtons[0]?.value)
  }
}
