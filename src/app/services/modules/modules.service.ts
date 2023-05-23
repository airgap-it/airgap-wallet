import { BaseModulesService, IsolatedModulePreviewMetadata, ModulesController, ProtocolService, UiEventService } from '@airgap/angular-core'
import { Inject, Injectable } from '@angular/core'
import { FilePickerPlugin, PickFilesResult } from '@capawesome/capacitor-file-picker'
import { FILE_PICKER_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

@Injectable({
  providedIn: 'root'
})
export class WalletModulesService extends BaseModulesService {
  constructor(
    modulesController: ModulesController,
    protocolService: ProtocolService,
    private readonly uiEventService: UiEventService,
    @Inject(FILE_PICKER_PLUGIN) private readonly filePicker: FilePickerPlugin
  ) {
    super(modulesController, protocolService)
  }

  // TODO: move to common components
  public async loadModule(): Promise<IsolatedModulePreviewMetadata> {
    let loader: HTMLIonLoadingElement | undefined

    try {
      const { files }: PickFilesResult = await this.filePicker.pickFiles({ 
        multiple: false,
        readData: false
      })
      const { name, path } = files[0]
      if (!path) {
        throw new Error(`Can't open the file.`)
      }

      loader = await this.uiEventService.getTranslatedLoader({
        message: 'isolated-modules.loader_message'
      })
      await loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))

      return this.readModuleMetadata(name, path)
    } finally {
      loader?.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
      loader = undefined
    }
  }
}