import { IonicModule } from '@ionic/angular'
import { RouterModule } from '@angular/router'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'
import { ComponentsModule } from '../../components/components.module'
import { TransactionConfirmPage } from './transaction-confirm'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TranslateModule,
    ComponentsModule,
    RouterModule.forChild([{ path: '', component: TransactionConfirmPage }])
  ],
  declarations: [TransactionConfirmPage]
})
export class TransactionConfirmPageModule {}
