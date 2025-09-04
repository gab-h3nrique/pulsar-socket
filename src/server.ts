// import necessary modules
import net from 'net'
import express from 'express'
import http from 'http'
import Auth from './socket/auth'
import Handle from './socket/handle'
import routes from './routes/routes'

// ================= CONFIG ================= //
// define the port number from environment variable or default to 3000
const PORT = parseInt(process.env.PORT || '3000', 10)

// ================= EXPRESS SETUP ================= //
// create an express app instance
const app = express()

// middleware to parse incoming JSON requests
app.use(express.json())

// middleware to handle CORS and preflight requests
app.use((req, res, next) => {

  // allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*')

  // allow common HTTP methods
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

  // allow all headers
  res.setHeader('Access-Control-Allow-Headers', '*')

  // allow credentials if needed
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  // respond immediately to OPTIONS preflight requests
  if(req.method === 'OPTIONS') return res.sendStatus(200)

  // pass control to the next middleware or route
  next()

})

// attach the application routes
routes(app)

// create a "virtual" HTTP server that can be triggered manually
const HTTP_SERVER = http.createServer(app)

// helper function to handle HTTP requests received over net.Socket
function httpRequests(request: any, data: string) {

  // create an IncomingMessage object manually
  const req = new http.IncomingMessage(request)

  // create a ServerResponse object manually
  const res = new http.ServerResponse(req)

  // associate the socket with the request
  req.socket = request

  // initialize headers object
  req.headers = {}

  // extract the HTTP method from the first line of the request
  req.method = data.split(' ')[0]

  // extract the URL from the first line of the request
  req.url = data.split(' ')[1]

  // parse headers from the raw request lines
  data.split('\r\n').forEach(line => {

    // split each line into key and values
    const [key, ...vals] = line.split(': ')

    // if a key and values exist, assign to request headers in lowercase
    if(key && vals.length) req.headers[key.toLowerCase()] = vals.join(': ')

  })

  // assign the socket to the response so it can write back
  res.assignSocket(request)

  // manually emit the request event for the HTTP server
  HTTP_SERVER.emit('request', req, res)

  return

}

// ================= NET SERVER ================= //
// create a net server to handle both HTTP and WebSocket connections
const SERVER = net.createServer((socket) => {

  // wait for the first chunk of data from the client
  socket.once('data', (data) => {

    // convert the buffer to a string
    const str = data.toString()

    // ---------------- WebSocket handshake ----------------
    // detect if the connection is a WebSocket upgrade request
    if(str.startsWith('GET') && str.includes('Upgrade: websocket')) {

      // log that a WebSocket client connected
      console.log('WebSocket connection detected')

      // execute the custom handshake for your WebSocket auth
      Auth.handshake(socket, data)

      // handle subsequent data from the WebSocket client
      socket.on('data', (buf) => Handle.data(socket, buf))

      // handle socket errors
      socket.on('error', (err) => Handle.error(socket, err))

      // handle socket closure
      socket.on('close', (err) => Handle.close(socket, err))

      // exit the function because it's a WebSocket connection
      return

    }

    // ---------------- HTTP request ----------------
    // if not WebSocket, treat it as a normal HTTP request
    // forward the request to the express/http server
    httpRequests(socket, str)

  })

})

// start listening on the configured port for both HTTP and WebSocket
SERVER.listen(PORT, () => console.log(`✅ Server running on ws://localhost:${PORT} or http://localhost:${PORT}`))
