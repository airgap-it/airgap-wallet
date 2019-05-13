import { Component, Input } from '@angular/core'

@Component({
  selector: 'empty-state',
  templateUrl: 'empty-state.html',
  styleUrls: ['./empty-state.scss']
})
export class EmptyStateComponent {
  @Input()
  public imageName: string

  @Input()
  public text: string

  @Input()
  public fullHeight: boolean = true
}
