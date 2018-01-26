/* TEST FILE - Copyright (c) 2018 rpc-json - Tanase Laurentiu Iulian - https://github.com/RealTimeCom/rpc-json */
'use strict';

const rpc = require('./index.js');

// define custom server function 'query'
function query(response, head, body) {
    console.log('client-request', head, body.toString());
    // response back to client
    response('s-' + head, body).catch(e => console.log('e1', e));
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
client.pipe(server).pipe(client).
exec('head1', 'body1').
then(r => {
    console.log('log1', r);
    return client.exec('head2', 'body2');
}).
then(r => console.log('log2', r)).
catch(e => console.log('e2', e));
// log3 before log2
/* same as async / await , see below
client.exec('head3', 'body3').
then(r => console.log('log3', r)).
catch(e => console.log('e3', e));
*/
// using async / await
(async () => {
    console.log('log3', await client.exec('head3', 'body3'));
})().catch(e => console.log('e3', e));

/* Output
---------
client-request head1 body1
client-request head3 body3
log1 { head: 's-head1', body: <Buffer 62 6f 64 79 31> }
client-request head2 body2
log2 { head: 's-head2', body: <Buffer 62 6f 64 79 32> }
log3 { head: 's-head3', body: <Buffer 62 6f 64 79 33> }
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
        client2.exec('head4', 'body4').
        then(r => console.log('log4', r)).
        catch(e => console.log('e4', e));
    }).on('end', () => console.log('socket client end'));
}).on('close', () => console.log('socket server close'));

/* Output
---------
log4 { head: 'head4', body: <Buffer 62 6f 64 79 34> }
*/

setTimeout(() => {
    client2.exec('head5', 'body5').
    then(r => {
        console.log('log5', r);
        client2.push(null); // optional, end client2 connection
        client2.server.close(); // optional, close the socket server
    }).catch(e => console.log('e5', e));
}, 1000); // call exec on 'client2' after 1 second

/* Output
---------
log5 { head: 'head5', body: <Buffer 62 6f 64 79 35> }
socket server close
socket client end
*/