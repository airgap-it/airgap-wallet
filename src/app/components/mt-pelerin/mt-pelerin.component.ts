import { Component, OnInit } from '@angular/core'
import { ModalController } from '@ionic/angular'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'app-mt-pelerin',
  templateUrl: './mt-pelerin.component.html',
  styleUrls: ['./mt-pelerin.component.scss']
})
export class MtPelerinComponent implements OnInit {
  url: string

  constructor(public modalController: ModalController) {}

  ngOnInit() {}

  public dismiss() {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openMtPelerinLink() {
    if (this.url) {
      window.open(this.url, '_blank')
    }
  }
}
