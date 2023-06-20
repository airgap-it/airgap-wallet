import { Component } from '@angular/core'
import { PopoverController } from '@ionic/angular'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'isolated-modules-details-popover',
  templateUrl: './isolated-modules-details-popover.component.html',
  styleUrls: ['./isolated-modules-details-popover.component.scss']
})
export class IsolatedModulesDetailsPopoverComponent {
  private readonly onRemove: Function

  public constructor(private readonly popoverController: PopoverController) {}

  public removeModule(): void {
    if (this.onRemove) {
      this.onRemove()
      this.popoverController.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
    }
  }
}
