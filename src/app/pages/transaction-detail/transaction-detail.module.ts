import { AirGapAngularCoreModule } from '@airgap/angular-core'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'

import { ComponentsModule } from '../../components/components.module'

import { TransactionDetailPage } from './transaction-detail'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TranslateModule,
    ComponentsModule,
    AirGapAngularCoreModule,
    RouterModule.forChild([{ path: '', component: TransactionDetailPage }])
  ],
  declarations: [TransactionDetailPage]
})
export class TransactionDetailPageModule {}
