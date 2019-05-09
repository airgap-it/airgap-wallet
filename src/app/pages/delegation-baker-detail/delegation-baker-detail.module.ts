import { IonicModule } from '@ionic/angular'
import { RouterModule } from '@angular/router'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { DelegationBakerDetailPage } from './delegation-baker-detail'
import { ComponentsModule } from '../../components/components.module'
import { TranslateModule } from '@ngx-translate/core'
import { PipesModule } from '../../pipes/pipes.module'
import { MomentModule } from 'ngx-moment'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
    MomentModule,
    RouterModule.forChild([{ path: '', component: DelegationBakerDetailPage }])
  ],
  declarations: [DelegationBakerDetailPage]
})
export class DelegationBakerDetailPageModule {}
