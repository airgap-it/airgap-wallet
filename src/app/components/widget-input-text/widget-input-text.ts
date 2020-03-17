import { Component, Input } from '@angular/core'
import { FormGroup } from '@angular/forms'

@Component({
  selector: 'widget-input-text',
  templateUrl: 'widget-input-text.html',
  styleUrls: ['widget-input-text.scss']
})
export class WidgetInputText {
  @Input()
  public id: string

  @Input()
  public label: string

  @Input()
  public defaultValue?: string

  @Input()
  public widgetForm?: FormGroup

  public onValueChanged() {
    if (this.widgetForm) {
      this.widgetForm.setValue({
        [this.id]: ''
      })
    }
  }
}
