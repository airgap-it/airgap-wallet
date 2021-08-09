import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'
import { ZXingScannerModule } from '@zxing/ngx-scanner'
import { PipesModule } from 'src/app/pipes/pipes.module'

import { ComponentsModule } from '../../components/components.module'

import { ScanPage } from './scan'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TranslateModule,
    ComponentsModule,
    ZXingScannerModule,
    PipesModule,
    RouterModule.forChild([{ path: '', component: ScanPage }])
  ],
  declarations: [ScanPage]
})
export class ScanPageModule {}
