import { Component, Input } from '@angular/core'

@Component({
  selector: 'card-actionable',
  templateUrl: 'card-actionable.html'
})
export class CardActionableComponent {
  @Input()
  imageLeft: boolean = true

  @Input()
  imageName: string

  @Input()
  heading: string

  @Input()
  text: string
}
