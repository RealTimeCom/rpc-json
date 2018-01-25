/* TEST FILE - Copyright (c) 2018 rpc-json - Tanase Laurentiu Iulian - https://github.com/RealTimeCom/rpc-json */
'use strict';

const rpc = require('./index.js');

function request(response, head, body) {
    console.log('client-request', head, body.toString());
    // response back to client
    response('s-' + head, body).catch(console.error); // callback, server response
}

const server = new rpc.server(request); // create server stream and add custom function 'request'
const client = new rpc.client; // create client stream, no filter

client.pipe(server).pipe(client). // pipe: client (request to:) > server (response back to:) > client
exec((head, body) => { // server response: String "head1", Buffer "body1"
    console.log('server-response1', head, body.toString());
}, 'head1', 'body1'). // client request: String "head1", String "body1"
then(client.exec((head, body) => {
    console.log('server-response2', head, body.toString());
}, 'head2', 'body2')).
then(client.exec((head, body) => {
    console.log('server-response3', head, body.toString());
}, 'head3', 'body3')).
catch(console.error);
// and so on...
/**
console.log:
---
client-request head1 body1
server-response1 head1 body1
client-request head2 body2
server-response3 head2 body2
client-request head3 body3
server-response3 head3 body3
*/

function filter(response, head, body) {
    // verify if client needs response, and callback with custom arguments
    if (response) { response('filtered', 'f-' + head, 'f-' + body.toString()); }
}

const net = require('net');
const server2 = new rpc.server; // using default anonymous 'request' function, see bellow
const client2 = new rpc.client(filter); // using client 'filter' function

net.createServer(socket => { // client connected to the server:
    socket.pipe(server2).pipe(socket); // pipe 'rpc.server' to client connection 'socket'
}).
listen(function() { // server listen to a random port
    const a = this.address(); // get the server port and address
    client2.server = this; // optional, attach server object 'this' to 'client2'
    net.connect(a.port, a.address, function() { // client connected to the server:
        this.pipe(client2).pipe(this); // pipe 'rpc.client' to server socket connection 'this'
        client2.exec(function() { // server2 response
            console.log('server-response4', arguments);
        }, 'head4', 'body4').catch(console.error); // client2 request
    }).on('end', () => console.log('socket client end'));
}).on('close', () => console.log('socket server close'));
/**
console.log:
---
server-response4 { '0': 'filtered', '1': 'f-head4', '2': 'f-body4' }
*/

setTimeout(() => {
    client2.exec(function() { // server response
        console.log('server-response5', arguments);
        this.push(null); // optional, end client2 connection
        this.server.close(); // optional, close the socket server
    }, 'head5', 'body5').catch(console.error); // client2 request
    // client internal request, is faster than client2 net socket
    client.exec(null, 'head6', 'body6').catch(console.error); // null - discard callback response
}, 1000); // exec command on 'client2' after 1 second
/**
console.log:
---
client-request head6 body6
server-response5 { '0': 'filtered', '1': 'f-head5', '2': 'f-body5' }
socket server close
socket client end
*/