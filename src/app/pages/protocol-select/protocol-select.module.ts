import { IonicModule } from '@ionic/angular'
import { RouterModule } from '@angular/router'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ProtocolSelectPage } from './protocol-select'
import { ComponentsModule } from '../../components/components.module'
import { TranslateModule } from '@ngx-translate/core'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    RouterModule.forChild([{ path: '', component: ProtocolSelectPage }])
  ],
  declarations: [ProtocolSelectPage],
  exports: [],
  entryComponents: [ProtocolSelectPage]
})
export class ProtocolSelectPageModule {}
