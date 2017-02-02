## RPC JSON - Stream transform protocol
[![NPM](https://nodei.co/npm/rpc-json.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/rpc-json/)

[![Build Status](https://travis-ci.org/RealTimeCom/rpc-json.svg?branch=master)](http://travis-ci.org/RealTimeCom/rpc-json)
[![dependencies](https://david-dm.org/RealTimeCom/rpc-json.svg)](https://david-dm.org/RealTimeCom/rpc-json)

**RPC JSON - Server and Client Stream with JSON header and RAW body**
```sh
$ npm install rpc-json
```
### Run tests
Browse module (e.g. `node_modules/rpc-json`) install directory, and run tests:
```sh
$ npm test
# or
$ node test.js
```
Compare test results with <a href="https://travis-ci.org/RealTimeCom/rpc-json">travis run tests</a>.

### Include in your script
```js
const rpc = require('rpc-json');
```
### Server function example
```js
function request(response, head, body) {
    console.log('request', head, body.toString());
    // response back, like default server anonymous 'request' function
    response(head, body); // callback, server response
}
```
### Simple client-server stream pipe
Connect client and server streams and exec two requests on the server.
```js
const server = new rpc.server(request); // create server stream
const client = new rpc.client; // create client stream

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
```
### Simple client-server socket stream pipe
Create net socket server `socketServer` and connect client socket `this` to the server. Exec one request on the server.
```js
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
```
### Delay request
Execute a delay request after 1 second.
```js
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
```
### Server class `(request)`
* <b><code>request (response, head, body)</code></b> - function, optional, see below

### Server function `request (response, head, body)`
* <b><code>response (head, body)</code></b> - callback function, server response
* `head` - Value, can be any type (not a function) - deserialized with JSON
* `body` - Buffer or String
* `this` - Bind Server Object

Default server anonymous `request` function will response back to client with the same request `head` and `body` values, like this: `(response, head, body) => response(head, body)`

### Client class `(filter)`
* <b><code>filter (response, head, body)</code></b> - function, optional, see below

#### Client function `filter (response, head, body)`
* <b><code>response</code></b> - callback function, custom client response
* `head` - Value, can be any type (not a function) - deserialized with JSON
* `body` - Buffer or String
* `this` - Bind Client Object

### Client function `exec (response, head, body)`
* <b><code>response</code></b> - callback function, client response, null - discard
* `head` - Value, can be any type (not a function)
* `body` - Buffer or String
* `this` - Bind Client Object

### Custom error event names
* `serverError` - error event name for `rpc.server`
* `clientError` - error event name for `rpc.client`

```js
server.on('serverError', e => console.log('onServerError', e));
client.on('clientError', e => console.log('onClientError', e));
```

**For more informations, consult or run the <a href="https://github.com/RealTimeCom/rpc-json/blob/master/test.js"><b>test.js</b></a> file.**

--------------------------------------------------------
**RPC JSON** is licensed under the MIT license. See the included `LICENSE` file for more details.
