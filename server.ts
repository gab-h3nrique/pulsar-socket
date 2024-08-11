import http from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import crypto from 'crypto'

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()


const server = http.createServer((req, res) => {

  const parsedUrl = parse(req.url!, true)
  handle(req, res, parsedUrl)

  console.log('Received a request.')

})

// const websocket = new WebSocketServer({ server, clientTracking: true });
const websocket = new WebSocket.Server({ server, clientTracking: true });

const clients = []
const channels: { name: string; clients: any[] }[] = []

websocket.on('connection', (socket, req)=> {

  // socket.isAlive = true;

  socket.on('error', console.error)

  socket.on('pong', (socket) => {

    // console.log(socket.)

  });

  socket.on('message', (data) => {

    const PARSED = JSON.parse(data as any);

    const { event, payload, channel } = PARSED;

    console.log('receiving message... ', channel)

    if(event == 'join' || event == 'leave') return joinOrLeaveChannel(socket, req, PARSED)

    if(channel) return handleChannelMessage(socket, req, PARSED)

    // handleMessage(socket, req, PARSED)

    // websocket.clients.forEach(client => {

    //   // send event to all client, excluding itself
    //   if(client == socket || client.readyState != WebSocket.OPEN) return

    //   client.send(JSON.stringify({event, payload}))

    // })

    // socket.send(JSON.stringify({event, payload}))


  
  })

  // console.log('connecting...! id:', req.headers['sec-websocket-key']);
  socket.send(JSON.stringify({event: 'authenticated', payload: { ...req.headers } }))

})




// implement autenticate
server.on('upgrade', (req, socket, head)=> {

  console.log('connecting...', req.headers['sec-websocket-key'])

  socket.on('error', onSocketError);

  // socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
  // socket.destroy();
  // return;

  // websocket.handleUpgrade(req, socket, head, (event)=> {

  //   console.log('aqui')
  //   websocket.emit('connection', event, req);

  // })

  socket.removeListener('error', onSocketError);
  
})




websocket.on('close', () => {

  clearInterval(interval);

});




app.prepare().then(()=> {

  server.listen(port, ()=> console.log(`Server listening at http://localhost:${port} as ${ dev ? 'development' : process.env.NODE_ENV }`))

})








// functions 

function handleChannelMessage(socket: WebSocket, req: http.IncomingMessage, data: any) {

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

}

function handleMessage(socket: WebSocket, req: http.IncomingMessage, data: any) {

  console.log('message')
}

function joinOrLeaveChannel(socket: WebSocket, req: http.IncomingMessage, data: any) {

  let channel = channels.find(c => c.name == data.payload.channel)

  if(data.event == 'leave' && channel) {

    // channel.clients = channel.clients.filter(c => c !== req.headers['sec-websocket-key'])
    channel.clients = channel.clients.filter(c => c !== socket)

    console.log('channels: ', channels)
  
    return
  
  }

  if(!channel) return channels.push({ name: data.payload.channel, clients: [ socket ] })
  
  // channel.clients = [ ...channel.clients.filter(c => c !== req.headers['sec-websocket-key']), req.headers['sec-websocket-key'] ] 
  channel.clients = [ ...channel.clients.filter(c => c !== socket), socket ] 

  console.log('channels: ', channels)

}




const interval = setInterval(() => {

  websocket.clients.forEach(function each(socket) {
    // if (ws.isAlive === false) return ws.terminate();

    // ws.isAlive = false;
    socket.ping();

  });

}, 500);

function onSocketError(error: any) {

  console.log('error: ', error.message)

}

function heartbeat(e: any) {

  console.log('heartbeat: ', e)

}
