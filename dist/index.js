"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const ws_1 = __importDefault(require("ws"));
const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const server = http_1.default.createServer((req, res) => {
    console.log('--------Received a request.--------');
});
// const websocket = new WebSocketServer({ server, clientTracking: true });
const websocket = new ws_1.default.Server({ server, clientTracking: true });
let clients = [];
const channels = [];
const pingInterval = 3000;
websocket.on('connection', (socket, req) => {
    socket.on('error', console.error);
    socket.on('message', (data) => handleMessage(socket, req, data));
    clients.push({ key: req.headers['sec-websocket-key'], isAlived: true, client: socket });
});
// implement autenticate
server.on('upgrade', (req, socket, head) => {
    console.log('connecting...', req.headers['sec-websocket-key']);
    // socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    // socket.destroy();
    // return;
    // websocket.handleUpgrade(req, socket, head, (event)=> {
    //   console.log('aqui')
    //   websocket.emit('connection', event, req);
    // })
});
const interval = setInterval(handleDisconnection, pingInterval);
websocket.on('close', () => {
    clearInterval(interval);
});
server.listen(port, () => console.log(`Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`));
// functions 
function handleMessage(socket, req, data) {
    const PARSED = JSON.parse(data);
    const { event, payload, channel } = PARSED;
    if (event == 'pong')
        return resetDisconnectTimer(socket);
    if (event == 'join' || event == 'leave')
        return joinOrLeaveChannel(socket, req, PARSED);
    if (channel)
        return channelMessage(socket, req, PARSED);
    message(socket, req, PARSED);
}
function channelMessage(socket, req, data) {
    console.log('receiving message... ');
    const { event, payload, channel } = data;
    const foundChannel = channels.find(c => c.name === channel);
    if (!foundChannel)
        return;
    const STRINGIFIED = JSON.stringify({ event, payload });
    websocket.clients.forEach(client => {
        // send event to all client, excluding itself
        if (client == socket || client.readyState != ws_1.default.OPEN)
            return;
        const foundClient = foundChannel.clients.find(e => e == client);
        if (!foundClient)
            return;
        client.send(STRINGIFIED);
    });
}
function message(socket, req, data) {
    const { event, payload } = data;
    const STRINGIFIED = JSON.stringify({ event, payload });
    socket.send(STRINGIFIED);
}
function joinOrLeaveChannel(socket, req, data) {
    let channel = channels.find(c => c.name == data.payload.channel);
    if (data.event == 'leave' && channel) {
        channel.clients = channel.clients.filter(c => c !== socket);
        console.log('channels: ', channels);
        return;
    }
    if (!channel)
        return channels.push({ name: data.payload.channel, clients: [socket] });
    channel.clients = [...channel.clients.filter(c => c !== socket), socket];
    console.log('channels: ', channels);
}
function handleDisconnection() {
    // secure method to handler disconnect
    // const STRINGIFIED_PING = JSON.stringify({ event: 'ping', payload: null })
    // clients.forEach(c => {
    //   if(!c.isAlived) return disconnectThis(c)
    //   c.isAlived = false
    //   c.client.send(STRINGIFIED_PING)
    // })
    const connectedClients = [];
    websocket.clients.forEach(socket => {
        const client = clients.find(c => c.client === socket);
        if (client)
            connectedClients.push(client);
    });
    clients = connectedClients;
}
function resetDisconnectTimer(socket) {
    const foundClient = clients.find((c) => c.client == socket);
    if (!foundClient)
        return;
    foundClient.isAlived = true;
}
function disconnectThis(c) {
    setTimeout(() => {
        if (c.isAlived)
            return;
        c.client.terminate();
        clients = clients.filter(e => e.key !== c.key);
    }, pingInterval * 2);
}
