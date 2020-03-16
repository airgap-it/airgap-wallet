import { Component, Input } from '@angular/core'
import { UIWidget } from 'src/app/models/widgets/UIWidget'

@Component({
  selector: 'widget-selector',
  templateUrl: 'widget-selector.html',
  styleUrls: ['widget-selector.scss']
})
export class WidgetSelector {
  @Input()
  public widget: UIWidget
}
