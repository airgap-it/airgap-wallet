import { UIWidget, UIWidgetType } from './UIWidget'

export class UIInputText extends UIWidget {
  readonly type = UIWidgetType.INPUT_TEXT

  constructor(id: string, readonly label: string, readonly defaultValue?: string) {
    super(id)
  }
}
