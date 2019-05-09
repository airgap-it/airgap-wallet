import { IonicModule } from '@ionic/angular'
import { RouterModule } from '@angular/router'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { IntroductionPage } from './introduction'
import { ComponentsModule } from '../../components/components.module'
import { TranslateModule } from '@ngx-translate/core'
import { IntroductionDownloadPageModule } from '../introduction-download/introduction-download.module'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    TranslateModule,
    IntroductionDownloadPageModule,
    RouterModule.forChild([{ path: '', component: IntroductionPage }])
  ],
  declarations: [IntroductionPage]
})
export class IntroductionPageModule {}
