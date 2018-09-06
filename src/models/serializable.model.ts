export abstract class Serializable {
  fillFromJSON(json: string): this {
    let jsonObj = JSON.parse(json)
    for (const propName of Object.keys(jsonObj)) {
      this[propName] = JSON.parse(jsonObj[propName])
    }
    return this
  }

  fillFromObj(jsonObj: Object): this {
    for (const propName of Object.keys(jsonObj)) {
      this[propName] = jsonObj[propName]
    }
    return this
  }
}
