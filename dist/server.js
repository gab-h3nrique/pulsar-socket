"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const auth_1 = __importDefault(require("./socket/auth"));
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes/routes"));
const handle_1 = __importDefault(require("./socket/handle"));
/** ================= HTTP API ================= **/
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3001', 10);
const HTTP_SERVER = (0, express_1.default)();
HTTP_SERVER.use(express_1.default.json());
HTTP_SERVER.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // ou '*'
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // se necessário
    if (req.method === 'OPTIONS')
        return res.sendStatus(200);
    next();
});
(0, routes_1.default)(HTTP_SERVER);
/** ================= PURE TCP (SOCKET) ================= **/
const PORT = parseInt(process.env.PORT || '3000', 10);
const SERVER = net_1.default.createServer();
SERVER.on('connection', (socket) => {
    socket.once('data', buffer => auth_1.default.handshake(socket, buffer));
    socket.on('data', buffer => handle_1.default.data(socket, buffer));
    socket.on('error', err => handle_1.default.error(socket, err));
    socket.on('close', err => handle_1.default.close(socket, err));
});
SERVER.listen(PORT, () => console.log(`✅ Socket server ${process.env.NODE_ENV ? process.env.NODE_ENV : 'development'} started in ws://localhost:${PORT}`));
HTTP_SERVER.listen(HTTP_PORT, () => console.log(`✅ Http server ${process.env.NODE_ENV ? process.env.NODE_ENV : 'development'} started in http://localhost:${HTTP_PORT}`));
