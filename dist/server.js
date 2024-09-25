"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const ws_1 = __importDefault(require("ws"));
const auth_1 = __importDefault(require("./auth"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pools = [];
const server = http_1.default.createServer((req, res) => {
    console.log('--------Received a request.--------');
});
// const websocket = new WebSocketServer({ server, clientTracking: true });
const websocket = new ws_1.default.Server({ server, clientTracking: true });
websocket.on('connection', async (socket, req) => {
    addNewClient(socket, req);
    socket.on('error', () => handleClose(socket, req));
    socket.on('close', () => handleClose(socket, req));
    socket.on('message', (data) => handleMessage(socket, req, data));
});
///////////////////////////////////////////////////////
////////////////////// FUNCTIONS //////////////////////
///////////////////////////////////////////////////////
//
//
/////// add client
async function addNewClient(socket, req) {
    if (!await verifyValidPool(req))
        return socket.terminate();
    const client = { key: req.headers['sec-websocket-key'], isAlived: true, socket: socket };
    const id = req.url.replace('/pool/', '').split('-')[1];
    const pool = pools.find(p => p.id == id);
    if (!pool)
        return pools.push({ id: id, channels: [], clients: [client] });
    pool.clients = [...pool.clients.filter(c => c.socket !== client.socket), client];
    console.log(`pools: ${pools.length}, channels: ${pools.reduce((a, b) => a + b.channels.length, 0)}, clients: ${pools.reduce((a, b) => a + b.clients.length, 0)}`);
}
//
//
/////// add client
async function verifyValidPool(req) {
    try {
        // getting pool's id from url
        const id = req.url.replace('/pool/', '').split('-')[1];
        const pool = await auth_1.default.query(`SELECT * FROM pools WHERE id = '${id}'`);
        if (!pool[0] || !pool[0]?.id)
            return false;
        return true;
    }
    catch (error) {
        // the SIGNATURE is wrong (POOL_TOKEN)
        console.log('blocked client: ', req.url);
        return false;
    }
}
//
//
/////// add client
async function verifyToken(socket, req, data) {
    try {
        // console.log('verifying token...')
        // getting pool's id from url
        const id = req.url.replace('/pool/', '').split('-')[1];
        const { event, payload } = data;
        // checking if token exists
        if (!payload || !payload.token)
            return socket.terminate();
        // try to decode token
        const decoded = jsonwebtoken_1.default.verify(payload.token, process.env.POOL_TOKEN);
        // checking if decoded token has the pool's name
        if (!decoded || !decoded.name)
            return socket.terminate();
        // doing query to found pool
        const pool = await auth_1.default.query(`SELECT * FROM pools WHERE id = '${id}' AND name = '${decoded.name}'`);
        // checking if pool exits on database
        if (!pool[0] || !pool[0]?.id)
            return socket.terminate();
        return;
    }
    catch (error) {
        // the SIGNATURE is wrong (POOL_TOKEN)
        console.log('blocked client: ', req.url);
        return socket.terminate();
    }
}
//
//
/////// add client
function handleMessage(socket, req, data) {
    const PARSED = JSON.parse(data);
    const { event, payload, channel } = PARSED;
    if (event == '__auth')
        return verifyToken(socket, req, PARSED);
    if (event == '__join' || event == '__leave')
        return joinOrLeaveChannel(socket, req, PARSED);
    if (channel)
        return channelMessage(socket, req, PARSED);
    message(socket, req, PARSED);
    return;
}
//
//
/////// add client
function message(socket, req, data) {
    console.log('seding some message...');
    // getting pool's id from url
    const id = req.url.replace('/pool/', '').split('-')[1];
    const pool = pools.find(p => p.id == id);
    if (!pool)
        return console.log('pool not found');
    const { event, payload } = data;
    const STRINGIFIED = JSON.stringify({ event, payload });
    pool.clients.forEach(c => {
        // checking closed clients or emitter
        if (c.socket == socket || c.socket.readyState !== 1)
            return;
        c.socket.send(STRINGIFIED);
    });
    return;
}
//
//
/////// add client
function channelMessage(socket, req, data) {
    console.log('seding some channel message...');
    // getting pool's id from url
    const id = req.url.replace('/pool/', '').split('-')[1];
    const pool = pools.find(p => p.id == id);
    if (!pool)
        return console.log('pool not found');
    const { event, payload, channel } = data;
    const foundChannel = pool.channels.find(c => c.name === channel);
    if (!foundChannel)
        return console.log('channel not found');
    const STRINGIFIED = JSON.stringify({ event, payload, channel });
    foundChannel.clients.forEach(c => {
        // checking closed clients or emitter
        if (c.socket == socket || c.socket.readyState !== 1)
            return;
        c.socket.send(STRINGIFIED);
    });
    return;
}
function joinOrLeaveChannel(socket, req, data) {
    // getting pool's id from url
    const id = req.url.replace('/pool/', '').split('-')[1];
    const pool = pools.find(p => p.id == id);
    if (!pool)
        return console.log('pool not found');
    const client = { key: req.headers['sec-websocket-key'], isAlived: true, socket: socket };
    const foundChannel = pool.channels.find(c => c.name == data.payload.channel);
    if (data.event == '__leave' && foundChannel) {
        foundChannel.clients = foundChannel.clients.filter(c => c.socket !== client.socket);
        return;
    }
    if (!foundChannel)
        return pool.channels.push({ name: data.payload.channel, clients: [client] });
    foundChannel.clients = [...foundChannel.clients.filter(c => c.socket !== socket), client];
}
//
//
/////// removing client
function handleClose(socket, req) {
    // getting pool's id from url
    const id = req.url.replace('/pool/', '').split('-')[1];
    const pool = pools.find(p => p.id == id);
    if (!pool)
        return console.log('pool not found');
    // remove disconnected clients
    pool.clients = pool.clients.filter(c => c.socket !== socket);
    // remove disconnected clients from channels
    const connectedClientsByChannel = [];
    pool.channels.forEach(channel => {
        const clients = channel.clients.filter(c => c.socket !== socket);
        connectedClientsByChannel.push({ name: channel.name, clients: clients });
    });
    pool.channels = connectedClientsByChannel;
}
//
//
/////// add client
function handleDisconnection() {
    console.log('ping.....');
    websocket.clients.forEach(socket => {
    });
    // const connectedClients = [];
    // websocket.clients.forEach(socket => {
    //   const client = clients.find(c => c.socket === socket);
    //   if(client) connectedClients.push(client);
    // });
    // clients = connectedClients;
}
const pingInterval = 1000; // 10seg
// FINAL
// const interval = setInterval(handleDisconnection, pingInterval);
const port = parseInt(process.env.PORT || '3000', 10);
server.listen(port, () => console.log(`Server listening at http://localhost:${port} as ${process.env.NODE_ENV ? process.env.NODE_ENV : 'development'}`));
