import { UIWidget, UIWidgetType } from './UIWidget'

export class UICheckbox extends UIWidget {
  readonly type: UIWidgetType = UIWidgetType.CHECKBOX

  constructor(id: string, readonly label: string, readonly defaultValue?: boolean) {
    super(id)
  }
}
