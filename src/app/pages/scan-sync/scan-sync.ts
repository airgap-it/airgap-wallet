import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { handleErrorSentry, ErrorCategory } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-scan-sync',
  templateUrl: 'scan-sync.html'
})
export class ScanSyncPage {
  constructor(public router: Router) {}

  goToScanPage() {
    this.router.navigateByUrl('/tabs/scan').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
