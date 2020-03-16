import { UIWidget, UIWidgetType } from './UIWidget'

export class UIIconText extends UIWidget {
  readonly type = UIWidgetType.ICON_TEXT

  constructor(readonly iconName: string, readonly text: string, readonly description?: string) {
    super()
  }
}
