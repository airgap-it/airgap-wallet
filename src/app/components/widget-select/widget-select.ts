import { Component, Input } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { UISelect } from 'src/app/models/widgets/input/UISelect'

@Component({
  selector: 'widget-select',
  templateUrl: 'widget-select.html',
  styleUrls: ['widget-select.scss']
})
export class WidgetSelect {
  @Input()
  public widget: UISelect

  @Input()
  public widgetForm: FormGroup

  public get optionTuples(): [string, string][] {
    return Array.from(this.widget.options.entries())
  }
}
