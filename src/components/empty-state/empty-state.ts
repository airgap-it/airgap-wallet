import { Component, Input } from '@angular/core'

@Component({
  selector: 'empty-state',
  templateUrl: 'empty-state.html'
})
export class EmptyStateComponent {
  @Input()
  imageName: string

  @Input()
  text: string

  @Input()
  fullHeight: boolean = true
}
