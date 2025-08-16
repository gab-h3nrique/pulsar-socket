"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const poolModel_1 = require("../models/poolModel");
const handle_1 = __importDefault(require("./handle"));
const SECRET = String(process.env.SECRET) || 'PULSAR-GABRIEL-HENRIQUE';
function factory() {
    return {
        SECRET: SECRET,
        generateToken: (poolId, poolName) => {
            return crypto_1.default.createHash('sha256').update(poolId + poolName + SECRET).digest('hex');
        },
        //
        //
        /////// make handshake
        handshake: async (socket, buffer) => {
            try {
                const req = buffer.toString();
                const [method, path, protocol] = req.split('\r\n')[0].split(" ");
                const match = req.match(/Sec-WebSocket-Key: (.+)/);
                if (!match)
                    throw new Error("Not a valid WebSocket request");
                const key = match[1].trim();
                const poolId = await Auth.verifyPool(path);
                const acceptKey = crypto_1.default.createHash('sha1').update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest('base64');
                const response = "HTTP/1.1 101 Switching Protocols\r\n" + "Upgrade: websocket\r\n" + "Connection: Upgrade\r\n" + `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`;
                socket.write(response);
                // console.log("✅ Handshake done!")
                handle_1.default.addClient(socket, poolId);
            }
            catch (error) {
                console.error("❌ Handshake:", error.message);
                socket.destroy();
                return;
            }
        },
        //
        //
        /////// verify pool from path
        verifyPool: async (path) => {
            const token = path.split('token=')[1];
            if (!token)
                throw new Error("Pool not found in path");
            const pool = await poolModel_1.PoolModel.find(token);
            if (!pool || !pool?.id)
                throw new Error("Pool not found");
            return pool.id;
        },
        //
        //
        /////// generate challenge
        generateChallenge: (poolId) => {
        }
    };
}
const Auth = factory();
exports.default = Auth;
