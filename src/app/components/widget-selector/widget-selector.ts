import { Component, Input } from '@angular/core'
import { UIWidget, UIWidgetType } from 'src/app/models/widgets/UIWidget'
import { FormGroup } from '@angular/forms'
import { UIInputWidget } from 'src/app/models/widgets/UIInputWidget'

@Component({
  selector: 'widget-selector',
  templateUrl: 'widget-selector.html',
  styleUrls: ['widget-selector.scss']
})
export class WidgetSelector {
  public UIWidgetType = UIWidgetType

  @Input()
  public widget: UIWidget

  @Input()
  public widgetForm?: FormGroup = null

  ngOnInit() {
    if (this.widgetForm && this.widget instanceof UIInputWidget) {
      this.widget.setFormControl(this.widgetForm.get(this.widget.id))
    }
    this.widget.onInit()
  }

  ngAfterContentInit(): void {
    this.widget.afterContentInit()
  }

  ngAfterViewInit(): void {
    this.widget.afterViewInit()
  }
}
