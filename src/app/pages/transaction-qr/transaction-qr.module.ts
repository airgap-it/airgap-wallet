import { AirGapAngularCoreModule } from '@airgap/angular-core'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'

import { ComponentsModule } from '../../components/components.module'
import { PipesModule } from '../../pipes/pipes.module'

import { TransactionQrPage } from './transaction-qr'

@NgModule({
  imports: [
    AirGapAngularCoreModule,
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    ComponentsModule,
    PipesModule,
    RouterModule.forChild([{ path: '', component: TransactionQrPage }])
  ],
  declarations: [TransactionQrPage]
})
export class TransactionQrPageModule {}
