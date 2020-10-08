import { Component, Input } from '@angular/core'
import { UIAlert } from 'src/app/models/widgets/display/UIAlert'

@Component({
  selector: 'widget-alert',
  templateUrl: 'widget-alert.html',
  styleUrls: ['widget-alert.scss']
})
export class WidgetAlert {
  @Input()
  public readonly widget: UIAlert
}
