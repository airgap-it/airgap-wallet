import { Component, Input } from '@angular/core'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'

@Component({
  selector: 'widget-account-summary',
  templateUrl: 'widget-account-summary.html',
  styleUrls: ['widget-account-summary.scss']
})
export class WidgetAccountSummary {
  @Input()
  public readonly widget: UIAccountSummary
}
