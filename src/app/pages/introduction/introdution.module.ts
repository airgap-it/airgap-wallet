import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'

import { ComponentsModule } from '../../components/components.module'
import { IntroductionDownloadPageModule } from '../introduction-download/introduction-download.module'

import { IntroductionPage } from './introduction'

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
