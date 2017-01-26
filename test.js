/* TEST FILE - Copyright (c) 2017 rpc-json - Tanase Laurentiu Iulian - https://github.com/RealTimeCom/rpc-json */
'use strict';

const rpc = require('./index.js');

function request(response, head, body) {
    console.log('request', head, body.toString());
    // response back, like default server anonymous 'request' function
    response(head, body); // callback, server response
}

const server = new rpc.server(request);
const client = new rpc.client;

client.pipe(server).pipe(client). // pipe: client (request to:) > server (response back to:) > client
exec((head, body) => { // server response: String "head1", Buffer "body1"
    console.log('response1', head, body.toString());
}, 'head1', 'body1'). // client request: String "head1", String "body1"
exec((head, body) => {
    console.log('response2', head, body.toString());
}, 'head2', 'body2');

// and so on...
/**
console.log:
---
request head1 body1
response1 head1 body1
request head2 body2
response2 head2 body2
*/

const net = require('net');
const server2 = new rpc.server; // using default anonymous 'request' function
const client2 = new rpc.client;

const socketServer = net.createServer(socket => { // client connected to the server:
    socket.pipe(server2).pipe(socket); // pipe 'rpc.server' to client connection 'socket'
}).
listen(function() { // server listen to a random port
    const a = this.address(); // get the server port and address
    net.connect(a.port, a.address, function() { // client connected to the server:
        this.pipe(client2).pipe(this); // pipe 'rpc.client' to server connection 'this'
        client2.exec((head, body) => { // server response
            console.log('response3', head, body.toString());
        }, 'head3', 'body3'); // client request
    });
});
/**
console.log:
---
response3 head3 body3
*/

setTimeout(() => {
    client2.exec((head, body) => { // server response
        console.log('response4', head, body.toString());
        client2.push(null); // optional, end client2 connection
        socketServer.close(); // optional, close the socket server
    }, 'head4', 'body4'); // client request
}, 1000); // exec command on 'client2' after 1 second
/**
console.log:
---
response4 head4 body4
*/
