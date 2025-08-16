import net from 'net'
import http from 'http'
import jwt from 'jsonwebtoken'
import { PoolModel } from './models/poolModel'
import crypto from 'crypto'
import Auth from './socket/auth'
import express from 'express';
import routes from './routes/routes'
import Handle from './socket/handle'

/** ================= HTTP API ================= **/
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3001', 10)

const HTTP_SERVER = express()

HTTP_SERVER.use(express.json())

HTTP_SERVER.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // ou '*'
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true'); // se necessário
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

routes(HTTP_SERVER)


/** ================= PURE TCP (SOCKET) ================= **/
const PORT  = parseInt(process.env.PORT || '3000', 10)

const SERVER = net.createServer()

SERVER.on('connection', (socket) => {

  socket.once('data', buffer => Auth.handshake(socket, buffer))

  socket.on('data', buffer => Handle.data(socket, buffer))
  
  socket.on('error', err => Handle.error(socket, err))
  
  socket.on('close', err => Handle.close(socket, err))
  
})

























SERVER.listen(PORT, () => console.log(`✅ Socket server ${ process.env.NODE_ENV ? process.env.NODE_ENV : 'development' } started in ws://localhost:${PORT}`))
HTTP_SERVER.listen(HTTP_PORT, () => console.log(`✅ Http server ${ process.env.NODE_ENV ? process.env.NODE_ENV : 'development' } started in http://localhost:${HTTP_PORT}`))
