import { Component, Input } from '@angular/core'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { FormGroup } from '@angular/forms'
import { UIInputWidget } from 'src/app/models/widgets/UIInputWidget'

@Component({
  selector: 'widget-selector',
  templateUrl: 'widget-selector.html',
  styleUrls: ['widget-selector.scss']
})
export class WidgetSelector {
  @Input()
  public widget: UIWidget

  @Input()
  public widgetForm?: FormGroup = null

  ngOnInit() {
    if (this.widgetForm && this.widget instanceof UIInputWidget) {
      this.widget.setFormControl(this.widgetForm.get(this.widget.id))
    }
  }
}
