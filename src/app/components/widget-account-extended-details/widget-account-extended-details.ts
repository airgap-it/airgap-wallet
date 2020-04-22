import { Component, Input } from '@angular/core'
import { UIAccountExtendedDetails } from 'src/app/models/widgets/display/UIAccountExtendedDetails'

@Component({
  selector: 'widget-account-extended-details',
  templateUrl: 'widget-account-extended-details.html',
  styleUrls: ['widget-account-extended-details.scss']
})
export class WidgetAccountExtendedDetails {
  @Input()
  public readonly widget: UIAccountExtendedDetails
}
