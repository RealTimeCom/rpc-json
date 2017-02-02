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

function filter(response, head, body) {
    // verify if client needs response, and call back with custom arguments
    if (response) { response('filtered', 'f-' + head, 'f-' + body.toString()); }
}

const net = require('net');
const server2 = new rpc.server; // using default anonymous 'request' function
const client2 = new rpc.client(filter); // using client filter function

net.createServer(socket => { // client connected to the server:
    socket.pipe(server2).pipe(socket); // pipe 'rpc.server' to client connection 'socket'
}).
listen(function() { // server listen to a random port
    const a = this.address(); // get the server port and address
    client2.server = this; // optional, attach server object 'this' to 'client2'
    net.connect(a.port, a.address, function() { // client connected to the server:
        this.pipe(client2).pipe(this); // pipe 'rpc.client' to server socket connection 'this'
        client2.exec(function() { // server2 response
            console.log('response3', arguments);
        }, 'head3', 'body3'); // client2 request
    }).on('end', () => console.log('socket client end'));
}).on('close', () => console.log('socket server close'));
/**
console.log:
---
response3 { '0': 'filtered', '1': 'f-head3', '2': 'f-body3' }
*/

setTimeout(() => {
    client2.exec(function() { // server response
        console.log('response4', arguments);
        this.push(null); // optional, end client2 connection
        this.server.close(); // optional, close the socket server
    }, 'head4', 'body4'); // client2 request
    // client internal request, is faster than client2 net socket
    client.exec(null, 'head5', 'body5'); // null - discard callback response
}, 1000); // exec command on 'client2' after 1 second
/**
console.log:
---
request head5 body5
response4 { '0': 'filtered', '1': 'f-head4', '2': 'f-body4' }
socket server close
socket client end
*/
