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
const named = (process.platform === 'win32' ? '\\\\.\\pipe\\' : '/tmp/') + 'rpc'; // IPC file path + name

const srv = net.createServer(socket => { // on client connect
    socket.pipe(new rpc.server).pipe(socket); // create new 'rpc.server' object here, to reset data flow on each client
}).
listen(named, function() { // IPC server
    net.connect(named, function() { // on client connect
        const cli = new rpc.client; // create new 'rpc.client' object here, to reset data flow on each client
        this.pipe(cli).pipe(this); // attach client to the server connection
        cli.exec('head', 'body'). // exec call
        then(r => { // response from server
            console.log('log', r);
            cli.push(null); // optional, end client connection
            srv.close(); // optional, close the socket server
        }).catch(console.error);
    }).on('end', () => console.log('socket client end'));
}).on('close', () => console.log('socket server close'));

/* Output
---------
log { head: 'head', body: <Buffer 62 6f 64 79> }
socket server close
socket client end
*/
