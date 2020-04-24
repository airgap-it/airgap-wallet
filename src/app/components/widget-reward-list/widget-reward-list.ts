import { Component, Input } from '@angular/core'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'

@Component({
  selector: 'widget-reward-list',
  templateUrl: 'widget-reward-list.html',
  styleUrls: ['widget-reward-list.scss']
})
export class WidgetRewardList {
  @Input()
  public widget: UIRewardList
}
