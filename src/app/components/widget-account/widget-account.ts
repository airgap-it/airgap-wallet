import { Component, Input } from '@angular/core'
import { UIAccount } from 'src/app/models/widgets/display/UIAccount'

@Component({
  selector: 'widget-account',
  templateUrl: 'widget-account.html',
  styleUrls: ['widget-account.scss']
})
export class WidgetAccount {
  @Input()
  public readonly widget: UIAccount
}
