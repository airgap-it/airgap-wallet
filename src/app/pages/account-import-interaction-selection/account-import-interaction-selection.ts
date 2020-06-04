import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { NavController } from '@ionic/angular'

export enum AccountImportInteractionType {
  VAULT,
  LEDGER
}

@Component({
  selector: 'page-account-import-interaction-selection',
  templateUrl: 'account-import-interaction-selection.html',
  styleUrls: ['./account-import-interaction-selection.scss']
})
export class AccountInteractionSelectionPage {
  private readonly callback: (interactionType: AccountImportInteractionType) => void

  constructor(private readonly route: ActivatedRoute, private readonly navController: NavController) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      this.callback = info.callback
    }
  }

  public selectVault(): void {
    this.select(AccountImportInteractionType.VAULT)
  }

  public selectLedger(): void {
    this.select(AccountImportInteractionType.LEDGER)
  }

  private select(interactionType: AccountImportInteractionType): void {
    this.callback(interactionType)
    this.navController.pop()
  }
}
