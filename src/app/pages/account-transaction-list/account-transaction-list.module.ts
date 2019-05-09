import { IonicModule } from '@ionic/angular'
import { RouterModule } from '@angular/router'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { AccountTransactionListPage } from './account-transaction-list'
import { ComponentsModule } from '../../components/components.module'
import { PipesModule } from '../../pipes/pipes.module'
import { TranslateModule } from '@ngx-translate/core'
import { MomentModule } from 'ngx-moment'
import { MaterialIconsModule } from 'ionic2-material-icons'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
    MomentModule,
    MaterialIconsModule,
    RouterModule.forChild([{ path: '', component: AccountTransactionListPage }])
  ],
  declarations: [AccountTransactionListPage]
})
export class AccountTransactionListPageModule {}
