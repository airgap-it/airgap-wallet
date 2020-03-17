import { Component, Input } from '@angular/core'
import { FormGroup } from '@angular/forms'

@Component({
  selector: 'widget-select',
  templateUrl: 'widget-select.html',
  styleUrls: ['widget-select.scss']
})
export class WidgetSelect {
  @Input()
  public id: string

  @Input()
  public label: string

  @Input()
  public options: Map<any, string>

  @Input()
  public defaultOption?: any

  @Input()
  public widgetForm?: FormGroup

  constructor() {
    if (this.defaultOption) {
      this.setFormValue(this.defaultOption)
    }
  }

  public get optionTuples(): [any, string][] {
    return Array.from(this.options.entries())
  }

  public onOptionSelected(option: any) {
    this.setFormValue(option)
  }

  private setFormValue(option: any) {
    console.log(this.id)
    if (this.widgetForm) {
      this.widgetForm.setValue({
        [this.id]: option
      })
    }
  }
}
