"use strict"

import os from "os";
import net from 'net'
import Format from '../utils/format'



interface ClientType { 
  socket: net.Socket,
  poolId: string,
  channels: string[],
}

function factory() {
  /**
  * Decodes a single WebSocket frame (client → server) into a UTF-8 string.
  *
  * Assumptions/notes:
  * - Handles text frames (opcode 0x1) and close frames (opcode 0x8).
  * - Ignores fragmentation/continuation (FIN is not inspected).
  * - For 64-bit lengths (payloadLength == 127), only the lower 32 bits are read (supports up to ~4GB).
  * - Uses Buffer.subarray() (non-copying view) instead of the deprecated Buffer.slice().
  * - Mutates the payload view during unmasking (changes the underlying buffer region).
  */
  // function decodeMessage(buffer: Buffer): string {

  //   // First header byte: FIN (1) + RSV1-3 (3) + OPCODE (4).
  //   const firstByte = buffer[0]                            

  //   // Mask lower 4 bits to extract the OPCODE (0x1 text, 0x2 binary, 0x8 close, 0x9 ping, 0xA pong).
  //   const opCode = firstByte & 0x0f                         

  //   // If it's a Close frame (0x8), signal the caller and stop parsing.
  //   if(opCode === 0x8) return "__close__"
  //   if(opCode === 0x9) return "__ping__"    // Ping
  //   if(opCode === 0xA) return "__pong__"    // Pong             

  //   // Second header byte: MASK flag (1) + 7-bit payload length (or an indicator).
  //   const secondByte = buffer[1]                            

  //   // Check MASK bit (0x80). Non-zero means the frame is masked (client → server must be).
  //   const isMasked = secondByte & 0x80                      

  //   // Extract the 7-bit length. Values 0..125 = actual length, 126/127 = extended length follows.
  //   let payloadLength = secondByte & 0x7f                   

  //   // Start right after the 2-byte base header (firstByte + secondByte).
  //   let offset = 2        

  //   // 126 indicates an extended 16-bit length field.
  //   if(payloadLength === 126) {

  //     // Read 2 bytes (big-endian) as the true payload length (0..65535).
  //     payloadLength = buffer.readUInt16BE(offset)  

  //     // Advance past the extended length field.
  //     offset += 2     

  //     // 127 indicates an extended 64-bit length field.
  //   } else if(payloadLength === 127) {                      
      
  //     // Read only the lower 32 bits (skip the high 4 bytes). Supports up to ~4GB.
  //     payloadLength = buffer.readUInt32BE(offset + 4)       
      
  //     // Advance past the full 8-byte extended length field.
  //     offset += 8                                           
      
  //   }

  //   // Placeholder for the 4-byte masking key (present if MASK bit is set).
  //   let maskingKey: Buffer | undefined                      

  //   // If the MASK flag is set (client frames should always be).
  //   if(isMasked) {  

  //     // Take a non-copying 4-byte view for the masking key.
  //     maskingKey = buffer.subarray(offset, offset + 4)      

  //     // Move past the masking key to the start of the payload.
  //     offset += 4   

  //   }

  //   // Create a view over the payload bytes (no copy, shares memory).
  //   const payload = buffer.subarray(offset, offset + payloadLength) 

  //   // If not masked (e.g., server frame) just decode as UTF-8 and return.
  //   if(!isMasked || !maskingKey) return payload.toString("utf8")    

  //   // Unmask each payload byte in place.
  //   for (let i = 0; i < payload.length; i++) {    

  //   // XOR with the corresponding masking key byte (key cycles every 4 bytes).
  //     payload[i] ^= maskingKey[i % 4]      

  //   }

  //   // Convert the now-unmasked payload bytes to a UTF-8 string and return.
  //   return payload.toString("utf8")                         

  // }
  function decodeMessage(buffer: Uint8Array): string {

    // ---------------------------------------------------------
    // Step 1: Read the first header byte
    // ---------------------------------------------------------
    // FIN (1 bit) + RSV1-3 (3 bits) + OPCODE (4 bits)
    const firstByte = buffer[0]

    // ---------------------------------------------------------
    // Step 2: Extract the OPCODE (lower 4 bits)
    // ---------------------------------------------------------
    // OPCODE values: 0x1 = text, 0x2 = binary, 0x8 = close, 0x9 = ping, 0xA = pong
    const opCode = firstByte & 0x0f

    // ---------------------------------------------------------
    // Step 3: Handle control frames immediately
    // ---------------------------------------------------------
    if (opCode === 0x8) return "__close__"  // Close frame
    if (opCode === 0x9) return "__ping__"   // Ping frame
    if (opCode === 0xA) return "__pong__"   // Pong frame

    // ---------------------------------------------------------
    // Step 4: Read the second header byte
    // ---------------------------------------------------------
    // MASK flag (1 bit) + 7-bit payload length (or indicator)
    const secondByte = buffer[1]

    // ---------------------------------------------------------
    // Step 5: Determine if the payload is masked
    // ---------------------------------------------------------
    // Non-zero means the payload is masked (client → server)
    const isMasked = (secondByte & 0x80) !== 0

    // ---------------------------------------------------------
    // Step 6: Extract the 7-bit payload length
    // ---------------------------------------------------------
    let payloadLength = secondByte & 0x7f

    // Offset starts right after the 2-byte base header
    let offset = 2

    // ---------------------------------------------------------
    // Step 7: Handle extended payload lengths
    // ---------------------------------------------------------
    if (payloadLength === 126) {
      // 16-bit extended payload length (big-endian)
      payloadLength = (buffer[offset] << 8) | buffer[offset + 1]

      offset += 2

    } else if (payloadLength === 127) {
      // 64-bit extended payload length
      // Here we only read the lower 32 bits (supports up to ~4GB)
      payloadLength = (
        (buffer[offset + 4] << 24) |
        (buffer[offset + 5] << 16) |
        (buffer[offset + 6] << 8) |
        buffer[offset + 7]
      )

      offset += 8

    }

    // ---------------------------------------------------------
    // Step 8: Extract the masking key if present
    // ---------------------------------------------------------
    let maskingKey: Uint8Array | undefined

    if (isMasked) {
      // Take a 4-byte view for the masking key (no copy)
      maskingKey = buffer.subarray(offset, offset + 4)

      offset += 4 // Move past the masking key

    }

    // ---------------------------------------------------------
    // Step 9: Extract the payload bytes (no copy, shares memory)
    // ---------------------------------------------------------
    const payload = buffer.subarray(offset, offset + payloadLength)

    // ---------------------------------------------------------
    // Step 10: If not masked, decode directly as UTF-8 string
    // ---------------------------------------------------------
    if (!isMasked || !maskingKey) {
      // TextDecoder decodes a Uint8Array to a string using UTF-8
      return new TextDecoder().decode(payload)

    }

    // ---------------------------------------------------------
    // Step 11: Unmask the payload in place
    // ---------------------------------------------------------
    for (let i = 0; i < payload.length; i++) {
      // XOR each byte with the corresponding masking key byte
      // Masking key cycles every 4 bytes
      payload[i] ^= maskingKey[i % 4]

    }

    // ---------------------------------------------------------
    // Step 12: Convert the unmasked payload to a UTF-8 string
    // ---------------------------------------------------------
    return new TextDecoder().decode(payload)

  }

  /**
   * Encodes a UTF-8 string into a single WebSocket frame (server → client).
  */
  // function encodeMessage(message: string): Buffer {           

  //   // Convert the input string into a UTF-8 encoded Buffer.                      
  //   const payload = Buffer.from(message, "utf8")              

  //   // Determine the payload length (number of bytes).                           
  //   const length = payload.length                             

  //   // WebSocket frame header will be constructed into a list of Buffers.         
  //   const header: Buffer[] = []                              

  //   // First header byte: FIN=1 (final frame) + RSV1-3=0 + OPCODE=0x1 (text).     
  //   header.push(Buffer.from([0x81]))                          

  //   // Handle payload length encoding according to WebSocket RFC 6455.            
  //   if(length < 126) {                                        

  //     // If length fits in 7 bits, encode directly into the second byte.         
  //     header.push(Buffer.from([length]))                      

  //   } else if(length < 65536) {                               

  //     // If 126 ≤ length < 65536, use 2-byte extended length indicator.          
  //     const extended = Buffer.alloc(3)                        

  //     // Second byte = 126 (signals next 2 bytes are the length).                
  //     extended[0] = 126                                       

  //     // Write 16-bit unsigned integer length in big-endian format.              
  //     extended.writeUInt16BE(length, 1)                       

  //     header.push(extended)                                   

  //   } else {                                                  

  //     // If length ≥ 65536, use 8-byte extended length indicator.                
  //     const extended = Buffer.alloc(9)                        

  //     // Second byte = 127 (signals next 8 bytes are the length).                
  //     extended[0] = 127                                       

  //     // Write 64-bit length as big-endian unsigned integer.                     
  //     extended.writeBigUInt64BE(BigInt(length), 1)            

  //     header.push(extended)                                   

  //   }                                                         

  //   // Concatenate all header parts with the payload.                           
  //   return Buffer.concat([...header, payload])                

  // }
  function encodeMessage(message: string): Uint8Array {

    // ---------------------------------------------------------
    // Step 1: Convert the input string into a UTF-8 byte array
    // ---------------------------------------------------------
    // TextEncoder encodes a string into a Uint8Array in UTF-8 format
    const payload = new TextEncoder().encode(message)

    // ---------------------------------------------------------
    // Step 2: Determine the payload length in bytes
    // ---------------------------------------------------------
    // This is necessary to encode the WebSocket frame header correctly
    const length = payload.length

    // ---------------------------------------------------------
    // Step 3: Prepare an array to hold the header parts
    // ---------------------------------------------------------
    // WebSocket headers can have multiple parts depending on payload length
    const headerParts: Uint8Array[] = []

    // ---------------------------------------------------------
    // Step 4: Construct the first header byte
    // ---------------------------------------------------------
    // FIN=1 (final frame), RSV1-3=0 (no extensions), OPCODE=0x1 (text frame)
    headerParts.push(Uint8Array.of(0x81))

    // ---------------------------------------------------------
    // Step 5: Encode the payload length according to RFC 6455
    // ---------------------------------------------------------
    if (length < 126) {
      // If the payload length fits in 7 bits (0-125), use it directly
      headerParts.push(Uint8Array.of(length))

    } else if (length < 65536) {
      // If length is between 126 and 65535, use 2-byte extended payload length
      const extended = new Uint8Array(3)

      // Second byte = 126 indicates that the next 2 bytes are the length
      extended[0] = 126

      // Encode the length as a 16-bit unsigned integer in big-endian format
      extended[1] = (length >> 8) & 0xff  // high byte
      extended[2] = length & 0xff         // low byte

      headerParts.push(extended)

    } else {
      // If length ≥ 65536, use 8-byte extended payload length
      const extended = new Uint8Array(9)

      // Second byte = 127 indicates that the next 8 bytes are the length
      extended[0] = 127

      // Encode the length as a 64-bit unsigned integer in big-endian format
      const bigLen = BigInt(length)

      // Loop through each byte from most significant to least significant
      for (let i = 0; i < 8; i++) {

        extended[8 - i] = Number((bigLen >> BigInt(i * 8)) & 0xffn)

      }

      headerParts.push(extended)
    }

    // ---------------------------------------------------------
    // Step 6: Concatenate all header parts with the payload
    // ---------------------------------------------------------
    // Calculate the total frame length
    let totalLength = headerParts.reduce((sum, part) => sum + part.length, 0) + payload.length;

    // Create the final Uint8Array to hold header + payload
    const frame = new Uint8Array(totalLength);

    // Copy each header part into the final frame
    let offset = 0;
    for (const part of headerParts) {
      frame.set(part, offset);
      offset += part.length;
    }

    // Copy the payload after the header
    frame.set(payload, offset);

    // ---------------------------------------------------------
    // Step 7: Return the complete WebSocket frame
    // ---------------------------------------------------------
    return frame;
  }

  /**
   * 
   * 
  * Handles WebSocket client connections and messages.
  * 
  */
  const CLIENTS: ClientType[] = []
  /**
   * 
  */
  let COUNT_MESSAGE = 0
  /**
  * 
  *
  * Logs the current state of the WebSocket server.
  */
  let previousLogLines = 0;
  /**
   * 
   * 
   * Logs the current state of the WebSocket server.
   */
  function logs() {
    const usedMem = process.memoryUsage().rss
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const cpuLoad = os.loadavg()[0]
    const cpuPercent = ((cpuLoad / os.cpus().length) * 100).toFixed(1);
    const now = new Date().toLocaleString()
    const PORT = parseInt(process.env.PORT || '3000', 10)
    
    console.clear()

    const log = (`
\x1b[32m───────────────────────────────────\x1b[0m
\x1b[36m🚀 Server Status Report\x1b[0m (${now})

📡 \x1b[33mActive Pools:\x1b[0m      ${0}
👥 \x1b[33mConnected Clients:\x1b[0m ${CLIENTS.length}
💬 \x1b[33mMessages Sent:\x1b[0m     ${COUNT_MESSAGE}

\x1b[36m📊 System Info\x1b[0m

⚡ \x1b[33mCPU Usage:\x1b[0m         ${cpuPercent}%
🧠 \x1b[33mMemory Used:\x1b[0m       ${Format.bytes(usedMem)} / ${Format.bytes(freeMem)}
🕒 \x1b[33mUptime:\x1b[0m            ${Format.upTime(process.uptime().toFixed(0))}

\x1b[36m✅ Running on\x1b[0m ws://localhost:${PORT} \x1b[36mor\x1b[0m http://localhost:${PORT}
\x1b[32m───────────────────────────────────\x1b[0m
    `);

    
    process.stdout.write(`\x1b[H\x1b[2J`); // cursor home + clear screen
    process.stdout.write(log);

    // console.log(log)
  }
  // function logs() {
  //   console.clear()
  //   console.log(`🟢 total clients: ${CLIENTS.length} | 💬 messages: ${COUNT_MESSAGE}`)
  // }
  /**
  *
  */
  setInterval(logs, 5000)
  /**
  * 
  * 
  * Handles periodic ping for all clients
  * 
 */
  // const TIMER = 30000 // 30 seconds
  /**
   * 
   */
  // setInterval(() => {

  //   CLIENTS.forEach(c => {

  //     // checking closed clients
  //     if(c.socket.destroyed) return Handle.removeClient(c.socket)
  
  //     // checking if socket is ready
  //     if(c.socket.readyState !== 'open') return Handle.removeClient(c.socket)
  
  //     // sending ping
  //     Handle.ping(c.socket)

  //   })

  // }, TIMER)
  /**
  * Handles incoming data from a WebSocket client.
  * 
  * @param socket - The WebSocket client socket.
  * @param buffer - The incoming data buffer.
  */
  return {
    /**
     * 
     * 
     * Adds a new client to the list of connected clients.
     * 
    */
    addClient: (socket: net.Socket, poolId: string) => {

      CLIENTS.push({ socket, poolId, channels: [] })

      // console.log("🟢 total clients:", CLIENTS.length)

    },
    /**
     * 
     * 
    * Removes a client from the list of connected clients.
    * 
    */
    removeClient: (socket: net.Socket) => {

      // console.log("⭕ Client removed")

      const index = CLIENTS.findIndex(c => c.socket === socket)

      socket.destroy()

      if(index === -1) return
      
      CLIENTS.splice(index, 1)

      // console.log("🔴 total clients:", CLIENTS.length)

    },
    /**
     * 
     * 
    * Handles incoming data from a WebSocket client.
    * 
    */
    data: (socket: net.Socket, buffer: Buffer) => {

      const DECODED = decodeMessage(buffer as Uint8Array)

      // handle close frame
      if(DECODED === "__close__") return Handle.removeClient(socket)

      // handle ping frame
      if(DECODED === "__ping__") return Handle.ping(socket)

      // handle pong frame
      if(DECODED === "__pong__") return

      // ignore anything that's not JSON
      if(!DECODED.startsWith("{") && !DECODED.startsWith("[")) return

      const PARSED = JSON.parse(DECODED as any)

      if(PARSED.event == '__join' || PARSED.event == '__leave') return Handle.joinOrLeaveChannel(socket, PARSED)

      COUNT_MESSAGE++

      if(PARSED.channel) return Handle.channelMessage(socket, PARSED)

      Handle.message(socket, PARSED)

      return

    },
    /**
     * 
     * 
    * Sends a message to all clients in the same pool.
    * 
    */
    message: (socket: net.Socket, data: any) => {

      // console.log('📨')

      const client = CLIENTS.find(c => c.socket === socket)

      if(!client) return console.log('⛔ Client not found')

      const poolClients = CLIENTS.filter(c => c.poolId === client?.poolId)

      const { event, payload } = data

      const STRINGIFIED = JSON.stringify({ event, payload })

      const ENCODED = encodeMessage(STRINGIFIED)

      poolClients.forEach(c => {

        // checking if socket is the emitter
        if(c.socket === socket) return

        // checking closed clients
        if(c.socket.destroyed) return

        // checking if socket is ready
        if(c.socket.readyState !== 'open') return

        // sending message
        c.socket.write(ENCODED)

      })

      return

    },
    /**
     * 
     * 
    * Sends a message to all clients in the same channel.
    * 
    */
    channelMessage: (socket: net.Socket, data: any) => {

      const client = CLIENTS.find(c => c.socket === socket)

      if(!client) return console.log('⛔ Client not found')

      const poolClients = CLIENTS.filter(c => c.poolId === client?.poolId)
        
      const { event, payload, channel } = data

      const channelClients = poolClients.filter(c => c.channels.includes(channel))

      const STRINGIFIED = JSON.stringify({ event, payload })

      const ENCODED = encodeMessage(STRINGIFIED)

      channelClients.forEach(c => {

        // checking if socket is the emitter
        if(c.socket === socket) return

        // checking closed clients
        if(c.socket.destroyed) return

        // checking if socket is ready
        if(c.socket.readyState !== 'open') return

        // sending message
        c.socket.write(ENCODED)

      })

      return

    },
    /**
     * 
     * 
    * Handles joining or leaving a channel.
    * 
    */
    joinOrLeaveChannel: (socket: net.Socket, data: any) => {

      const { channel } = data.payload

      const client = CLIENTS.find(c => c.socket === socket)
      
      if(!client) return console.log('⛔ Client not found')
        
      const channels = client.channels.filter(c => c !== channel)
        
      // if channel is not defined, remove it
      if(data.event == '__leave') return client.channels = channels

      // adding channel
      client.channels = [...channels, channel]

    },
    /**
     * 
     * 
    * Sends a ping message to the client.
    * 
    */
    ping: (socket: net.Socket) => {

      // 0x89 = FIN + opcode ping
      const pingFrame = new Uint8Array([0x89, 0x00]);

      socket.write(pingFrame)

    },
    /**
     * 
     * 
    * Sends a pong message to the client.
    * 
    */
    pong: (socket: net.Socket) => {

      // 0x8A = FIN + opcode pong
      const pongFrame = new Uint8Array([0x8A, 0x00])

      socket.write(pongFrame)

    },
    /**
     * 
     * 
    * Handles error events from a WebSocket client.
    * 
    */
    error: (socket: net.Socket, error: any) => {

      Handle.removeClient(socket)

      // console.error("❌ Socket error:", error.message)

    },
    /**
     * 
     * 
    * Handles close events from a WebSocket client.
    * 
    */
    close: (socket: net.Socket, error: any) => {

      Handle.removeClient(socket)

      // console.error("❌ Socket close:", error.message)

    },


  }


}

const Handle = factory()

export default Handle