"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const format_1 = __importDefault(require("../utils/format"));
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
    function decodeMessage(buffer) {
        // First header byte: FIN (1) + RSV1-3 (3) + OPCODE (4).
        const firstByte = buffer[0];
        // Mask lower 4 bits to extract the OPCODE (0x1 text, 0x2 binary, 0x8 close, 0x9 ping, 0xA pong).
        const opCode = firstByte & 0x0f;
        // If it's a Close frame (0x8), signal the caller and stop parsing.
        if (opCode === 0x8)
            return "__close__";
        if (opCode === 0x9)
            return "__ping__"; // Ping
        if (opCode === 0xA)
            return "__pong__"; // Pong             
        // Second header byte: MASK flag (1) + 7-bit payload length (or an indicator).
        const secondByte = buffer[1];
        // Check MASK bit (0x80). Non-zero means the frame is masked (client → server must be).
        const isMasked = secondByte & 0x80;
        // Extract the 7-bit length. Values 0..125 = actual length, 126/127 = extended length follows.
        let payloadLength = secondByte & 0x7f;
        // Start right after the 2-byte base header (firstByte + secondByte).
        let offset = 2;
        // 126 indicates an extended 16-bit length field.
        if (payloadLength === 126) {
            // Read 2 bytes (big-endian) as the true payload length (0..65535).
            payloadLength = buffer.readUInt16BE(offset);
            // Advance past the extended length field.
            offset += 2;
            // 127 indicates an extended 64-bit length field.
        }
        else if (payloadLength === 127) {
            // Read only the lower 32 bits (skip the high 4 bytes). Supports up to ~4GB.
            payloadLength = buffer.readUInt32BE(offset + 4);
            // Advance past the full 8-byte extended length field.
            offset += 8;
        }
        // Placeholder for the 4-byte masking key (present if MASK bit is set).
        let maskingKey;
        // If the MASK flag is set (client frames should always be).
        if (isMasked) {
            // Take a non-copying 4-byte view for the masking key.
            maskingKey = buffer.subarray(offset, offset + 4);
            // Move past the masking key to the start of the payload.
            offset += 4;
        }
        // Create a view over the payload bytes (no copy, shares memory).
        const payload = buffer.subarray(offset, offset + payloadLength);
        // If not masked (e.g., server frame) just decode as UTF-8 and return.
        if (!isMasked || !maskingKey)
            return payload.toString("utf8");
        // Unmask each payload byte in place.
        for (let i = 0; i < payload.length; i++) {
            // XOR with the corresponding masking key byte (key cycles every 4 bytes).
            payload[i] ^= maskingKey[i % 4];
        }
        // Convert the now-unmasked payload bytes to a UTF-8 string and return.
        return payload.toString("utf8");
    }
    function encodeMessage(message) {
        // Convert the input string into a UTF-8 encoded Buffer.                      
        const payload = Buffer.from(message, "utf8");
        // Determine the payload length (number of bytes).                           
        const length = payload.length;
        // WebSocket frame header will be constructed into a list of Buffers.         
        const header = [];
        // First header byte: FIN=1 (final frame) + RSV1-3=0 + OPCODE=0x1 (text).     
        header.push(Buffer.from([0x81]));
        // Handle payload length encoding according to WebSocket RFC 6455.            
        if (length < 126) {
            // If length fits in 7 bits, encode directly into the second byte.         
            header.push(Buffer.from([length]));
        }
        else if (length < 65536) {
            // If 126 ≤ length < 65536, use 2-byte extended length indicator.          
            const extended = Buffer.alloc(3);
            // Second byte = 126 (signals next 2 bytes are the length).                
            extended[0] = 126;
            // Write 16-bit unsigned integer length in big-endian format.              
            extended.writeUInt16BE(length, 1);
            header.push(extended);
        }
        else {
            // If length ≥ 65536, use 8-byte extended length indicator.                
            const extended = Buffer.alloc(9);
            // Second byte = 127 (signals next 8 bytes are the length).                
            extended[0] = 127;
            // Write 64-bit length as big-endian unsigned integer.                     
            extended.writeBigUInt64BE(BigInt(length), 1);
            header.push(extended);
        }
        // Concatenate all header parts with the payload.                           
        return Buffer.concat([...header, payload]);
    }
    /**
     *
     *
    * Handles WebSocket client connections and messages.
    *
    */
    const CLIENTS = [];
    /**
     *
    */
    let COUNT_MESSAGE = 0;
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
        const usedMem = process.memoryUsage().rss;
        const totalMem = os_1.default.totalmem();
        const freeMem = os_1.default.freemem();
        const cpuLoad = os_1.default.loadavg()[0];
        const cpuPercent = ((cpuLoad / os_1.default.cpus().length) * 100).toFixed(1);
        const now = new Date().toLocaleString();
        console.clear();
        const log = (`
\x1b[32m───────────────────────────────────\x1b[0m
\x1b[36m🚀 Server Status Report\x1b[0m (${now})

📡 \x1b[33mActive Pools:\x1b[0m      ${0}
👥 \x1b[33mConnected Clients:\x1b[0m ${CLIENTS.length}
💬 \x1b[33mMessages Sent:\x1b[0m     ${COUNT_MESSAGE}
🕒 \x1b[33mUptime:\x1b[0m            ${process.uptime().toFixed(0)}

\x1b[36m📊 System Info\x1b[0m

⚡ \x1b[33mCPU Usage:\x1b[0m         ${cpuPercent}%
🧠 \x1b[33mMemory Used:\x1b[0m       ${format_1.default.bytes(usedMem)} / ${format_1.default.bytes(freeMem)}
\x1b[32m───────────────────────────────────\x1b[0m
    `);
        // if already has logs, move cursor up and clear
        if (previousLogLines > 0) {
            process.stdout.write(`\x1b[${previousLogLines}A`);
            process.stdout.write(`\x1b[0J`);
        }
        // who new log
        process.stdout.write(log);
        // update line count
        previousLogLines = log.split("\n").length;
    }
    /**
    *
    */
    setInterval(logs, 10000);
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
        addClient: (socket, poolId) => {
            CLIENTS.push({ socket, poolId, channels: [] });
            // console.log("🟢 total clients:", CLIENTS.length)
        },
        /**
         *
         *
        * Removes a client from the list of connected clients.
        *
        */
        removeClient: (socket) => {
            // console.log("⭕ Client removed")
            const index = CLIENTS.findIndex(c => c.socket === socket);
            socket.destroy();
            if (index === -1)
                return;
            CLIENTS.splice(index, 1);
            // console.log("🔴 total clients:", CLIENTS.length)
        },
        /**
         *
         *
        * Handles incoming data from a WebSocket client.
        *
        */
        data: (socket, buffer) => {
            const DECODED = decodeMessage(buffer);
            // handle close frame
            if (DECODED === "__close__")
                return Handle.removeClient(socket);
            // handle ping frame
            if (DECODED === "__ping__")
                return Handle.ping(socket);
            // handle pong frame
            if (DECODED === "__pong__")
                return;
            // ignore anything that's not JSON
            if (!DECODED.startsWith("{") && !DECODED.startsWith("["))
                return;
            const PARSED = JSON.parse(DECODED);
            if (PARSED.event == '__join' || PARSED.event == '__leave')
                return Handle.joinOrLeaveChannel(socket, PARSED);
            COUNT_MESSAGE++;
            if (PARSED.channel)
                return Handle.channelMessage(socket, PARSED);
            Handle.message(socket, PARSED);
            return;
        },
        /**
         *
         *
        * Sends a message to all clients in the same pool.
        *
        */
        message: (socket, data) => {
            // console.log('📨')
            const client = CLIENTS.find(c => c.socket === socket);
            if (!client)
                return console.log('⛔ Client not found');
            const poolClients = CLIENTS.filter(c => c.poolId === client?.poolId);
            const { event, payload } = data;
            const STRINGIFIED = JSON.stringify({ event, payload });
            const ENCODED = encodeMessage(STRINGIFIED);
            poolClients.forEach(c => {
                // checking if socket is the emitter
                if (c.socket === socket)
                    return;
                // checking closed clients
                if (c.socket.destroyed)
                    return;
                // checking if socket is ready
                if (c.socket.readyState !== 'open')
                    return;
                // sending message
                c.socket.write(ENCODED);
            });
            return;
        },
        /**
         *
         *
        * Sends a message to all clients in the same channel.
        *
        */
        channelMessage: (socket, data) => {
            const client = CLIENTS.find(c => c.socket === socket);
            if (!client)
                return console.log('⛔ Client not found');
            const poolClients = CLIENTS.filter(c => c.poolId === client?.poolId);
            const { event, payload, channel } = data;
            const channelClients = poolClients.filter(c => c.channels.includes(channel));
            const STRINGIFIED = JSON.stringify({ event, payload });
            const ENCODED = encodeMessage(STRINGIFIED);
            channelClients.forEach(c => {
                // checking if socket is the emitter
                if (c.socket === socket)
                    return;
                // checking closed clients
                if (c.socket.destroyed)
                    return;
                // checking if socket is ready
                if (c.socket.readyState !== 'open')
                    return;
                // sending message
                c.socket.write(ENCODED);
            });
            return;
        },
        /**
         *
         *
        * Handles joining or leaving a channel.
        *
        */
        joinOrLeaveChannel: (socket, data) => {
            const { channel } = data.payload;
            const client = CLIENTS.find(c => c.socket === socket);
            if (!client)
                return console.log('⛔ Client not found');
            const channels = client.channels.filter(c => c !== channel);
            // if channel is not defined, remove it
            if (data.event == '__leave')
                return client.channels = channels;
            // adding channel
            client.channels = [...channels, channel];
        },
        /**
         *
         *
        * Sends a ping message to the client.
        *
        */
        ping: (socket) => {
            // 0x89 = FIN + opcode ping
            const pingFrame = Buffer.from([0x89, 0x00]);
            socket.write(pingFrame);
        },
        /**
         *
         *
        * Sends a pong message to the client.
        *
        */
        pong: (socket) => {
            // 0x8A = FIN + opcode pong
            const pongFrame = Buffer.from([0x8A, 0x00]);
            socket.write(pongFrame);
        },
        /**
         *
         *
        * Handles error events from a WebSocket client.
        *
        */
        error: (socket, error) => {
            Handle.removeClient(socket);
            // console.error("❌ Socket error:", error.message)
        },
        /**
         *
         *
        * Handles close events from a WebSocket client.
        *
        */
        close: (socket, error) => {
            Handle.removeClient(socket);
            // console.error("❌ Socket close:", error.message)
        },
    };
}
const Handle = factory();
exports.default = Handle;
