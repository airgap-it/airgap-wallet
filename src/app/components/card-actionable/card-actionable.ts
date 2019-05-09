import { Component, Input } from '@angular/core'

@Component({
  selector: 'card-actionable',
  templateUrl: 'card-actionable.html',
  styleUrls: ['./card-actionable.scss']
})
export class CardActionableComponent {
  @Input()
  public imageLeft: boolean = true

  @Input()
  public imageName: string

  @Input()
  public heading: string

  @Input()
  public text: string
}
