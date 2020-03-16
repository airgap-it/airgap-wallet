export function extensionProperty(target: any) {
  return (owner: any, propertyKey: string) => {
    delete target[propertyKey]
    Object.defineProperty(target.prototype, propertyKey, {
      value: owner[propertyKey],
      enumerable: false,
      writable: false,
      configurable: false
    })
  }
}

export function extensionFunction(targetClass: any) {
  return (_: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const extensionFunction = descriptor.value
    targetClass.prototype[propertyKey] = function(...args) {
      return extensionFunction(this, ...args)
    }
  }
}
