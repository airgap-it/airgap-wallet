export enum UIWidgetType {
  ICON_TEXT = 'icon_text',
  INPUT_TEXT = 'input_text',
  SELECT = 'select',
  CHECKBOX = 'checkbox'
}

export abstract class UIWidget {
  abstract readonly type: UIWidgetType

  constructor(readonly id: string) {}
}
