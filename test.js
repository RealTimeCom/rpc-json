/* TEST FILE - Copyright (c) 2018 rpc-json - Tanase Laurentiu Iulian - https://github.com/RealTimeCom/rpc-json */
'use strict';

const rpc = require('./index.js');

// define custom server function 'query'
async function query(response, head, body) {
    console.log('client-request', head, body.toString());
    // response back to client
    return await response('s-' + head, body);
}

const server = new rpc.server(query); // using custom 'query' request function
const client = new rpc.client;

server. // add server events
on('serverError', e => console.log('onServerError', e)).
on('end', () => console.log('Server onEnd'));

client. // add client events
on('clientError', e => console.log('onClientError', e)).
on('end', () => console.log('Client onEnd'));

// pipe: client (request to:) > server (response back to:) > client
client.pipe(server).pipe(client);

// Promise
client.exec('head1', 'body1').
then(r1 => {
    console.log('log1', r1);
    return client.exec('head2', 'body2');
}).
then(r2 => {
    console.log('log2', r2);
    return client.exec('head3', 'body3');
}).
then(r3 => {
    console.log('log3', r3);
    test(); // continue test
}).
catch(console.error);

// async / await
async function test() {
    const r1 = await client.exec('ahead1', 'abody1');
    console.log('alog1', r1);
    const r2 = await client.exec('ahead2', 'abody2');
    console.log('alog2', r2);
    const r3 = await client.exec('ahead3', 'abody3');
    console.log('alog3', r3);
}

/* Output
---------
client-request head1 body1
log1 { head: 's-head1', body: <Buffer 62 6f 64 79 31> }
client-request head2 body2
log2 { head: 's-head2', body: <Buffer 62 6f 64 79 32> }
client-request head3 body3
log3 { head: 's-head3', body: <Buffer 62 6f 64 79 33> }
client-request ahead1 abody1
alog1 { head: 's-ahead1', body: <Buffer 61 62 6f 64 79 31> }
client-request ahead2 abody2
alog2 { head: 's-ahead2', body: <Buffer 61 62 6f 64 79 32> }
client-request ahead3 abody3
alog3 { head: 's-ahead3', body: <Buffer 61 62 6f 64 79 33> }
*/

const net = require('net');
const server2 = new rpc.server; // using default anonymous request function
const client2 = new rpc.client;

net.createServer(socket => { // on client connect
    socket.pipe(server2).pipe(socket); // attach 'server2' to client socket connection 'socket'
}).
listen('/tmp/rpc.sock', function() { // server listen to unix socket file 'rpc.sock'
    client2.server = this; // optional, attach server object 'this' to 'client2'
    net.connect('/tmp/rpc.sock', function() { // on client connect
        this.pipe(client2).pipe(this); // attach 'client2' to server socket connection 'this'
        client2.exec('head', 'body').
        then(r => {
            console.log('log', r);
            client2.push(null); // optional, end client2 connection
            client2.server.close(); // optional, close the socket server
        }).
        catch(console.error);
    }).on('end', () => console.log('socket client end'));
}).on('close', () => console.log('socket server close'));

/* Output
---------
log { head: 'head', body: <Buffer 62 6f 64 79> }
socket server close
socket client end
*/
