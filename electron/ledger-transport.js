const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid-singleton').default
const TransportNodeBle = require('@ledgerhq/hw-transport-node-ble').default

const transports = new Map()

process.on('SIGINT', () => {
  process.exit(-1)
})

process.on('SIGTERM', () => {
  process.exit(-1)
})

process.on('disconnect', () => {
  process.exit(0)
})

process.on('exit', () => {
  closeAll()
})

process.on('message', async message => {
  if (process.send) {
    let data = {}
    try {
      switch (message.type) {
        case 'get-devices':
          const devices = await getConnectedDevices(message.data.connectionType)
          data = { devices }
          break
        case 'open':
          const transportId = await openTransport(message.data.connectionType, message.data.descriptor)
          data = { transportId }
          break
        case 'send':
          const response = await send(
            message.data.transportId,
            message.data.cla,
            message.data.ins,
            message.data.p1,
            message.data.p2,
            message.data.hexData ? Buffer.from(message.data.hexData, 'hex') : undefined
          )
          data = { response: response ? response.toString('hex') : undefined }
          break
        case 'close':
          await close(message.data.transportId)
          break
      }
    } catch (error) {
      data = { error }
    }

    process.send({
      requestId: message.requestId,
      data: {
        type: `${message.type}-reply`,
        ...data
      }
    })
  }
})

async function getConnectedDevices(connectionType) {
  switch (connectionType) {
    case 'USB':
      return getUsbDevices()
    case 'BLE':
      return getBleDevices()
    default:
      return []
  }
}

async function openTransport(connectionType, descriptor) {
  let open
  switch (connectionType) {
    case 'USB':
      open = TransportNodeHid.open
      break
    case 'BLE':
      open = TransportNodeBle.open
      break
    default:
      return Promise.reject('Unknown connection type.')
  }
  const transport = await open(descriptor)
  const transportId = `${connectionType}-${new Date().getTime().toString()}`

  transports.set(transportId, transport)
  return transportId
}

async function send(transportId, cla, ins, p1, p2, data) {
  const transport = transports.get(transportId)
  if (transport) {
    const response = await transport.send(cla, ins, p1, p2, data)
    return response
  } else {
    return Buffer.alloc(0)
  }
}

async function close(transportId) {
  const transport = transports.get(transportId)
  if (transport) {
    await transport.close()
    transports.delete(transportId)
  }
}

function closeAll() {
  TransportNodeHid.disconnect()
  TransportNodeBle.disconnect()
}

async function getUsbDevices() {
  return TransportNodeHid.list()
    .then(descriptors => {
      return descriptors.map(descriptor => ({
        descriptor,
        type: 'USB'
      }))
    })
    .catch(() => [])
}

async function getBleDevices() {
  const listenPromise = new Promise(resolve => {
    const devices = []
    TransportNodeBle.listen({
      next: event => {
        if (event.type === 'add') {
          devices.push({
            descriptor: event.descriptor,
            type: 'BLE'
          })
        }
      },
      error: () => resolve([]),
      complete: () => resolve(devices)
    })
  })
  const timeoutPromise = new Promise(resolve => {
    setTimeout(() => {
      resolve([])
    }, 1000)
  })

  return Promise.race([listenPromise, timeoutPromise])
}
