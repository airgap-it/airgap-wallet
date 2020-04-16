import { Component, Input } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { UIInputText } from 'src/app/models/widgets/input/UIInputText'

@Component({
  selector: 'widget-input-text',
  templateUrl: 'widget-input-text.html',
  styleUrls: ['widget-input-text.scss']
})
export class WidgetInputText {
  @Input()
  public widget: UIInputText

  @Input()
  public widgetForm: FormGroup
}
