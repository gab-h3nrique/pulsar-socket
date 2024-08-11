// import http from 'http'
// import { parse } from 'url'
// import next from 'next'
// import { Server } from "socket.io";
 
// const port = parseInt(process.env.PORT || '3000', 10)
// const dev = process.env.NODE_ENV !== 'production'
// const app = next({ dev })
// const handle = app.getRequestHandler()

// let connection = null

// // const WebSocketServer = require('websocket').server

// const server = http.createServer((req, res) => {

//   const parsedUrl = parse(req.url!, true)
//   handle(req, res, parsedUrl)

//   console.log('Received a request.')

// })

// const websocket = new Server(server);

// websocket.on('connection', (socket)=> {

//   console.log('someone connected!');

// })



// app.prepare().then(()=> {

//   server.listen(port, ()=> console.log(`Server listening at http://localhost:${port} as ${ dev ? 'development' : process.env.NODE_ENV }`))

// })
