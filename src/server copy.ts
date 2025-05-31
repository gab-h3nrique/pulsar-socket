import net from 'net'
import jwt from 'jsonwebtoken'
import database from './auth'

interface PoolType {
  id: string,
  channels: ChannelType[],
  clients: ClientType[]
}

interface ChannelType {
  name: string,
  clients: ClientType[]
}

interface ClientType {
  key: any,
  isAlived: boolean,
  socket: net.Socket,
}

const pools: PoolType[] = []

const server = net.createServer((socket) => {

  socket.on('data', async (data) => handleMessage(socket, data))

  socket.on('error', () => handleClose(socket))

  socket.on('close', () => handleClose(socket))

  addNewClient(socket)

})

///////////////////////////////////////////////////////
////////////////////// FUNCTIONS //////////////////////
///////////////////////////////////////////////////////
//
//
/////// add client
async function addNewClient(socket: net.Socket) {

  if(!await verifyValidPool(socket)) return socket.destroy()

  const client = { key: socket.remoteAddress + ':' + socket.remotePort, isAlived: true, socket: socket}

  const id = socket.remoteAddress.split(':').pop()

  const pool = pools.find(p => p.id == id)

  if(!pool) return pools.push({ id: id,  channels: [], clients: [ client ] })

  pool.clients = [ ...pool.clients.filter(c => c.key !== client.key), client ]

  console.log(`pools: ${pools.length}, channels: ${pools.reduce((a, b) => a + b.channels.length, 0)}, clients: ${pools.reduce((a, b) => a + b.clients.length, 0)}`)

}
//
//
/////// add client
async function verifyValidPool(socket: net.Socket): Promise<boolean> {

  try {

    const id = socket.remoteAddress.split(':').pop()

    const pool = await database.query(`SELECT * FROM pools WHERE id = '${id}'`)

    if(!pool[0] || !pool[0]?.id) return false

    return true

  } catch (error) {

    console.log('blocked client: ', socket.remoteAddress)

    return false

  }

}
//
//
/////// add client
async function verifyToken(socket: net.Socket, data: any) {

  try {

    const id = socket.remoteAddress.split(':').pop()

    const { payload } = data

    if(!payload || !payload.token) return socket.destroy()

    const decoded: any = jwt.verify(payload.token, process.env.POOL_TOKEN)

    if(!decoded || !decoded.name) return socket.destroy()

    const pool = await database.query(`SELECT * FROM pools WHERE id = '${id}' AND name = '${decoded.name}'`)

    if(!pool[0] || !pool[0]?.id) return socket.destroy()

    return

  } catch (error) {

    console.log('blocked client: ', socket.remoteAddress)

    return socket.destroy()

  }

}
//
//
/////// handle message
function handleMessage(socket: net.Socket, rawData: Buffer) {

  const text = rawData.toString().trim()

  console.log('text: ', text)
    
  // Validação rápida
  if (!(text.startsWith('{') && text.endsWith('}'))) {
    // console.warn('Ignoring non-JSON message:', text)
    return
  }

  const data = JSON.parse(text)

  // const data = JSON.parse(rawData.toString())

  const { event, channel } = data

  if(event == '__auth') return verifyToken(socket, data)

  if(event == '__join' || event == '__leave') return joinOrLeaveChannel(socket, data)

  if(channel) return channelMessage(socket, data)

  message(socket, data)

}
//
//
/////// normal message
async function message(socket: net.Socket, data: any) {

  console.log('seding some message...')

  const pool = findPoolBySocket(socket)

  if(!pool) return console.log('pool not found')

  const { event, payload } = data

  const STRINGIFIED = JSON.stringify({ event, payload })

  const promises = []

  pool.clients.forEach(c => {

    if(c.socket === socket || c.socket.destroyed) return

    promises.push(new Promise<void>((res, rej) => {

      c.socket.write(STRINGIFIED, err => err ? rej(err) : res())

    }))

  })

  await Promise.all(promises)

}
//
//
/////// channel message
async function channelMessage(socket: net.Socket, data: any) {

  console.log('seding some channel message...')

  const pool = findPoolBySocket(socket)

  if(!pool) return console.log('pool not found')

  const { event, payload, channel } = data

  const foundChannel = pool.channels.find(c => c.name === channel)

  if(!foundChannel) return console.log('channel not found')

  const STRINGIFIED = JSON.stringify({ event, payload, channel })

  const promises = []

  foundChannel.clients.forEach(c => {

    if(c.socket === socket || c.socket.destroyed) return

    promises.push(new Promise<void>((res, rej) => {
      c.socket.write(STRINGIFIED, err => err ? rej(err) : res())
    }))

  })

  await Promise.all(promises)

}
//
//
/////// join/leave
function joinOrLeaveChannel(socket: net.Socket, data: any) {

  const pool = findPoolBySocket(socket)

  if(!pool) return console.log('pool not found')

  const client = { key: socket.remoteAddress + ':' + socket.remotePort, isAlived: true, socket: socket }

  const foundChannel = pool.channels.find(c => c.name == data.payload.channel)

  if(data.event == '__leave' && foundChannel) {

    foundChannel.clients = foundChannel.clients.filter(c => c.socket !== client.socket)

    return

  }

  if(!foundChannel) return pool.channels.push({ name: data.payload.channel, clients: [ client ] })

  foundChannel.clients = [ ...foundChannel.clients.filter(c => c.socket !== socket), client ]

}
//
//
/////// handle disconnection
function handleClose(socket: net.Socket) {

  console.log('client disconnected')

  const pool = findPoolBySocket(socket)

  if(!pool) return console.log('pool not found')

  pool.clients = pool.clients.filter(c => c.socket !== socket)

  const connectedClientsByChannel = []

  pool.channels.forEach(channel => {

    const clients = channel.clients.filter(c => c.socket !== socket)

    connectedClientsByChannel.push({ name: channel.name, clients: clients })

  })

  pool.channels = connectedClientsByChannel

}
//
//
/////// find pool by socket
function findPoolBySocket(socket: net.Socket): PoolType | undefined {

  console.log('socket: ', socket)

  const id = socket.remoteAddress.split(':').pop()

  return pools.find(p => p.id == id)

}

const port = parseInt(process.env.PORT || '3000', 10)

server.listen(port, () => console.log(`Server listening at http://localhost:${port} as ${ process.env.NODE_ENV ? process.env.NODE_ENV : 'development' }`))
