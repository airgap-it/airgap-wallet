import { IonicModule } from '@ionic/angular'
import { RouterModule } from '@angular/router'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { DisclaimerWebExtensionPage } from './disclaimer-web-extension'
import { ComponentsModule } from '../../components/components.module'
import { TranslateModule } from '@ngx-translate/core'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    RouterModule.forChild([{ path: '', component: DisclaimerWebExtensionPage }])
  ],
  declarations: [DisclaimerWebExtensionPage]
})
export class DisclaimerWebExtensionPageModule {}
