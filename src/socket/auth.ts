"use strict"

import net from 'net'
import crypto from 'crypto'
import { PoolModel } from "../models/poolModel"
import Handle from './handle'

const SECRET = String(process.env.SECRET) || 'PULSAR-GABRIEL-HENRIQUE'

function factory() {

  return {

    SECRET: SECRET,

    generateToken: (poolId: string, poolName: string) => {

      return crypto.createHash('sha256').update(poolId + poolName + SECRET).digest('hex');

    },
    //
    //
    /////// make handshake
    handshake: async (socket: net.Socket, buffer: Buffer) => {
    
      try {
    
        const req = buffer.toString() as any
    
        const [ method, path, protocol ] = req.split('\r\n')[0].split(" ");

        const match = req.match(/Sec-WebSocket-Key: (.+)/)
      
        if(!match) throw new Error("Not a valid WebSocket request")
    
        const key = match[1].trim()
    
        const poolId = await Auth.verifyPool(path)
    
        const acceptKey = crypto.createHash('sha1').update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest('base64')
        
        const response = "HTTP/1.1 101 Switching Protocols\r\n" + "Upgrade: websocket\r\n" + "Connection: Upgrade\r\n" + `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
    
        socket.write(response)
    
        // console.log("✅ Handshake done!")

        Handle.addClient(socket, poolId)
      
      } catch (error) {
    
        console.error("❌ Handshake:", error.message)
    
        socket.destroy()
    
        return 
        
      }
    
    },
    //
    //
    /////// verify pool from path
    verifyPool: async(path: string) => {

      const token = path.split('token=')[1]

      if(!token) throw new Error("Pool not found in path")
  
      const pool = await PoolModel.find(token)
  
      if(!pool || !pool?.id) throw new Error("Pool not found")
  
      return pool.id

    },
    //
    //
    /////// generate challenge
    generateChallenge: (poolId: string) => {


    }



  }


}

const Auth = factory()

export default Auth