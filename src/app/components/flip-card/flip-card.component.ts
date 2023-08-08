import { Component } from '@angular/core'

@Component({
  selector: 'flip-card',
  templateUrl: './flip-card.component.html',
  styleUrls: ['./flip-card.component.scss']
})
export class FlipCardComponent {
  toggleProperty = false

  constructor() {}

  ngOnInit() {}

  toggle() {
    this.toggleProperty = !this.toggleProperty
  }
}
