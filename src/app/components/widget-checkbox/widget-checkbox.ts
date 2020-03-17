import { Component, Input } from '@angular/core'
import { FormGroup } from '@angular/forms'

@Component({
  selector: 'widget-checkbox',
  templateUrl: 'widget-checkbox.html',
  styleUrls: ['widget-checkbox.scss']
})
export class WidgetCheckbox {
  @Input()
  public id: string

  @Input()
  public label: string

  @Input()
  public isChecked?: boolean

  @Input()
  public widgetForm?: FormGroup

  constructor() {
    if (this.isChecked !== undefined) {
      this.setFormValue(this.isChecked)
    }
  }

  public onCheckedChanged() {
    this.setFormValue(this.isChecked)
  }

  private setFormValue(isChecked: boolean) {
    if (this.widgetForm) {
      this.widgetForm.setValue({
        [this.id]: isChecked || false
      })
    }
  }
}
