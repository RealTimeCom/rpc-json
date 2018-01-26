## RPC JSON - Stream transform protocol
[![NPM](https://nodei.co/npm/rpc-json.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/rpc-json/)

[![Build Status](https://travis-ci.org/RealTimeCom/rpc-json.svg?branch=master)](http://travis-ci.org/RealTimeCom/rpc-json)
[![dependencies](https://david-dm.org/RealTimeCom/rpc-json.svg)](https://david-dm.org/RealTimeCom/rpc-json)

[![json-1](https://cloud.githubusercontent.com/assets/22455434/22550324/2ccec420-e958-11e6-88c2-51fbe948c362.png)](https://github.com/RealTimeCom/rpc-json)

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
### Define custom server function `query`
```js
function query(response, head, body) {
    console.log('client-request', head, body.toString());
    // response back to client
    response('s-' + head, body).catch(console.error);
}
```
### Simple client-server stream pipe
Promise or async/await `exec` few requests on the server.
```js
const server = new rpc.server(query); // using custom 'query' request function
const client = new rpc.client;

// pipe: client (request to:) > server (response back to:) > client
client.pipe(server).pipe(client).
exec('head1', 'body1').
then(r => {
    console.log('log1', r);
    return client.exec('head2', 'body2');
}).
then(r => console.log('log2', r)).
catch(console.error);

// using async/await
(async () => {
    console.log('log3', await client.exec('head3', 'body3'));
})().catch(console.error);

/* Output
---------
client-request head1 body1
client-request head3 body3
log1 { head: 's-head1', body: <Buffer 62 6f 64 79 31> }
client-request head2 body2
log2 { head: 's-head2', body: <Buffer 62 6f 64 79 32> }
log3 { head: 's-head3', body: <Buffer 62 6f 64 79 33> }
*/
```
### Simple client-server socket stream pipe
Create net socket server `socketServer` and connect client socket `this` to the server. Exec one request on the server.
```js
const net = require('net');
const server2 = new rpc.server; // using default anonymous request function
const client2 = new rpc.client;

net.createServer(socket => { // on client connect
    socket.pipe(server2).pipe(socket); // attach 'server2' to client socket connection 'socket'
}).
listen(function() { // server listen to unix socket file 'rpc.sock'
    const a = this.address(); // get the server port and address
    client2.server = this; // optional, attach server object 'this' to 'client2'
    net.connect(a.port, a.address, function() { // on client connect
        this.pipe(client2).pipe(this); // attach 'client2' to server socket connection 'this'
        client2.exec('head4', 'body4').
        then(r => console.log('log4', r)).
        catch(console.error);
    }).on('end', () => console.log('socket client end'));
}).on('close', () => console.log('socket server close'));

/* Output
---------
log4 { head: 'head4', body: <Buffer 62 6f 64 79 34> }
*/
```
### Execute a delay request and close connections
```js
setTimeout(() => {
    client2.exec('head5', 'body5').
    then(r => {
        console.log('log5', r);
        client2.push(null); // optional, end client2 connection
        client2.server.close(); // optional, close the socket server
    }).catch(console.error);
}, 1000); // call exec on 'client2' after 1 second

/* Output
---------
log5 { head: 'head5', body: <Buffer 62 6f 64 79 35> }
socket server close
socket client end
*/
```
### Server function `request (response, head, body)`
* <b><code>response (head, body)</code></b> - callback Promise function, server response
* `head` - Value, can be any type (not a function) - deserialized with JSON
* `body` - Buffer or String
* `this` - Bind Server Object

Default server anonymous `request` function will response back to client with the same request `head` and `body` values, like this: `(response, head, body) => response(head, body)`

### Client Promise function `exec (head, body)`
* <b><code>Promise.resolve( { head, body } )</code></b>
* `head` - Value, can be any type (not a function)
* `body` - Buffer or String

### Custom stream error event names
* `serverError` - error event name for `rpc.server`
* `clientError` - error event name for `rpc.client`

```js
server.on('serverError', e => console.log('onServerError', e));
client.on('clientError', e => console.log('onClientError', e));
```

**For more info consult or run the <a href="https://github.com/RealTimeCom/rpc-json/blob/master/test.js"><b>test.js</b></a> file.**

--------------------------------------------------------
**RPC JSON** is licensed under the MIT license. See the included `LICENSE` file for more details.
