import { Component, Input } from '@angular/core'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'

@Component({
  selector: 'widget-icon-text',
  templateUrl: 'widget-icon-text.html',
  styleUrls: ['widget-icon-text.scss']
})
export class WidgetIconText {
  @Input()
  public widget: UIIconText
}
