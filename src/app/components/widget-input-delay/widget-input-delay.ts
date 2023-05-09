import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'
import { FormGroup } from '@angular/forms'
import BigNumber from 'bignumber.js'
import { Subscription } from 'rxjs'
import { UIInputDelay } from 'src/app/models/widgets/input/UIInputDelay'

@Component({
  selector: 'widget-input-delay',
  templateUrl: 'widget-input-delay.html',
  styleUrls: ['widget-input-delay.scss']
})
export class WidgetInputDelay implements OnChanges {
  @Input()
  public widget: UIInputDelay

  @Input()
  public widgetForm: FormGroup

  public value: string | undefined

  private valueSubscription: Subscription | undefined

  public ngOnChanges(changes: SimpleChanges): void {
    const currentWidget = changes.widget.currentValue as UIInputDelay
    this.value = currentWidget.fixedMinValue

    if (changes.widgetForm.previousValue !== changes.widgetForm.currentValue) {
      this.valueSubscription?.unsubscribe()
      const currentWidgetForm = changes.widgetForm.currentValue as FormGroup
      this.valueSubscription = currentWidgetForm.get(this.widget.id).valueChanges.subscribe((value) => {
        const control = currentWidgetForm.get(this.widget.id)
        if (control.dirty && control.valid && new BigNumber(value).gte(currentWidget.fixedMinValue)) {
          this.value = value
        }
      })
    }
  }

  public onRangeChange(event) {
    const value: number = event.detail.value
    if (isNaN(value)) {
      return
    }

    this.widgetForm.get(this.widget.id).markAsPristine()
    this.widgetForm.patchValue({ [this.widget.id]: event.detail.value.toString() })
  }
}
