import http from 'http'
import net from 'net'
import WebSocket from 'ws';
import crypto from 'crypto'

interface ClientType { 
  key: any, 
  isAlived: boolean,
  client: WebSocket,
}
interface ChannelType { 
  name: string, 
  clients: WebSocket[]
}

const port = parseInt(process.env.PORT || '3000', 10)

const server = http.createServer((req, res) => {

  console.log('--------Received a request.--------')

})

// const websocket = new WebSocketServer({ server, clientTracking: true });
const websocket = new WebSocket.Server({ server, clientTracking: true });






let clients: ClientType[] = []
const channels: ChannelType[] = []

const pingInterval = 10000 // 10seg

websocket.on('connection', (socket, req)=> {

  addNewClient(socket, req)

  socket.on('error', console.error)

  socket.on('close', () => handleClose)

  socket.on('message', (data) => handleMessage(socket, req, data))

})

// implement autenticate
server.on('upgrade', (req, socket, head)=> {

  // socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
  // socket.destroy();
  // return;

  // websocket.handleUpgrade(req, socket, head, (event)=> {

  //   console.log('aqui')
  //   websocket.emit('connection', event, req);

  // })
  
})

const interval = setInterval(handleDisconnection, pingInterval);

server.listen(port, ()=> console.log(`Server listening at http://localhost:${port} as ${ process.env.NODE_ENV ? process.env.NODE_ENV : 'development' }`))

// functions 

// add client
function addNewClient(socket: WebSocket, req: http.IncomingMessage,) {

  clients.push({ key: req.headers['sec-websocket-key'], isAlived: true, client: socket})
  console.log('clients connected: ', clients.length)

}

/// MESSAGE FORMAT
function handleMessage(socket: WebSocket, req: http.IncomingMessage, data: any) {

  const PARSED = JSON.parse(data as any);

  const { event, payload, channel } = PARSED;

  // if(event == 'pong') return resetDisconnectTimer(socket)

  if(event == 'join' || event == 'leave') return joinOrLeaveChannel(socket, req, PARSED)

  if(channel) return channelMessage(socket, req, PARSED)

  message(socket, req, PARSED)

  return

}

function message(socket: WebSocket, req: http.IncomingMessage, data: any) {

  const { event, payload } = data

  const STRINGIFIED = JSON.stringify({ event, payload })

  socket.send(STRINGIFIED)

  return

}

function channelMessage(socket: WebSocket, req: http.IncomingMessage, data: any) {

  const { event, payload, channel } = data

  const foundChannel = channels.find(c => c.name === channel)

  if(!foundChannel) return

  const STRINGIFIED = JSON.stringify({ event, payload })

  websocket.clients.forEach(client => {

    // send event to all client, excluding itself
    if(client == socket || client.readyState != WebSocket.OPEN) return

    const foundClient = foundChannel.clients.find(e => e == client)

    if(!foundClient) return
    
    client.send(STRINGIFIED)

  })

  return

}

function joinOrLeaveChannel(socket: WebSocket, req: http.IncomingMessage, data: any) {

  let channel = channels.find(c => c.name == data.payload.channel)

  if(data.event == 'leave' && channel) {

    channel.clients = channel.clients.filter(c => c !== socket)

    console.log('channels: ', channels)
  
    return
  
  }

  if(!channel) return channels.push({ name: data.payload.channel, clients: [ socket ] })
  
  channel.clients = [ ...channel.clients.filter(c => c !== socket), socket ] 

  console.log('channels: ', channels)

}

/// HANDLE CLOSE
function handleClose(socket: WebSocket, code: number, reason: Buffer) {

  clients = clients.filter((c)=> c.client !== socket)

}

function handleDisconnection() {

  const connectedClients = [];

  websocket.clients.forEach(socket => {

    const client = clients.find(c => c.client === socket);

    if(client) connectedClients.push(client);

  });
  
  clients = connectedClients;

}
