import { Component, Input } from '@angular/core'

@Component({
  selector: 'widget-icon-text',
  templateUrl: 'widget-icon-text.html',
  styleUrls: ['widget-icon-text.scss']
})
export class WidgetIconText {
  @Input()
  public id: string

  @Input()
  public iconName: string

  @Input()
  public text: string

  @Input()
  public description?: string
}
