import { Component, OnInit } from '@angular/core'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { ModalController } from '@ionic/angular'

@Component({
  selector: 'app-beacon-request',
  templateUrl: './beacon-request.page.html',
  styleUrls: ['./beacon-request.page.scss']
})
export class BeaconRequestPage implements OnInit {
  constructor(private readonly modalController: ModalController) {}

  ngOnInit() {}

  public dismiss() {
    this.modalController.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
