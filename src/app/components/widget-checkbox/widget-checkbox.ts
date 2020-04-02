import { Component, Input } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { UICheckbox } from 'src/app/models/widgets/input/UICheckbox'

@Component({
  selector: 'widget-checkbox',
  templateUrl: 'widget-checkbox.html',
  styleUrls: ['widget-checkbox.scss']
})
export class WidgetCheckbox {
  @Input()
  public widget: UICheckbox

  @Input()
  public widgetForm: FormGroup
}
