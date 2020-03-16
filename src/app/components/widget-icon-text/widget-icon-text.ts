import { Component, Input } from '@angular/core'

@Component({
  selector: 'widget-icon-text',
  templateUrl: 'widget-icon-text.html',
  styleUrls: ['widget-icon-text.scss']
})
export class WidgetIconText {
  @Input()
  public iconName: string = 'logo-usd'

  @Input()
  public text: string = 'test'

  @Input()
  public description?: string = 'test'
}
