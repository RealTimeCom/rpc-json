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
### Define custom server async `query` function
```js
async function query(response, head, body) {
    console.log('client-request', head, body.toString());
    // response back to client
    return await response('s-' + head, body);
}
```
### Simple client-server stream pipe
```js
const server = new rpc.server(query); // using custom 'query' request function
const client = new rpc.client;

// pipe: client (request to:) > server (response back to:) > client
client.pipe(server).pipe(client);
```
### Promise `exec` calls
```js
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
}).
catch(console.error);

/* Output
---------
log1 { head: 's-head1', body: <Buffer 62 6f 64 79 31> }
client-request head2 body2
log2 { head: 's-head2', body: <Buffer 62 6f 64 79 32> }
client-request head3 body3
log3 { head: 's-head3', body: <Buffer 62 6f 64 79 33> }
*/
```
### async/await `exec` calls
```js
(async () => {
    const r1 = await client.exec('head1', 'body1');
    console.log('log1', r1);
    const r2 = await client.exec('head2', 'body2');
    console.log('log2', r2);
    const r3 = await client.exec('head3', 'body3');
    console.log('log3', r3);
})().catch(console.error);

/* Output
---------
log1 { head: 's-head1', body: <Buffer 62 6f 64 79 31> }
client-request head2 body2
log2 { head: 's-head2', body: <Buffer 62 6f 64 79 32> }
client-request head3 body3
log3 { head: 's-head3', body: <Buffer 62 6f 64 79 33> }
*/
```
### Simple client-server socket stream pipe
```js
const net = require('net');
const server2 = new rpc.server; // using default anonymous request function
const client2 = new rpc.client;

net.createServer(socket => { // on client connect
    socket.pipe(server2).pipe(socket); // attach 'server2' to client socket connection 'socket'
}).
listen(function() { // server listen to random port and address
    const a = this.address(); // get the server port and address
    client2.server = this; // optional, attach server object 'this' to 'client2'
    net.connect(a.port, a.address, function() { // on client connect
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
```
### Server async function `request (<Promise> response, head, body)`
* `head` - Value, can be any type (not a function) - deserialized with JSON
* `body` - Buffer or String
* `this` - Bind Server Object
* return - <b><code>&lt;Promise&gt; response (head, body)</code></b> - callback server response

Default server anonymous async `request` function will response back to client with the same request `head` and `body` values, like this: `async (response, head, body) => await response(head, body)`

### Client Promise function `exec (head, body)`
* `head` - Value, can be any type (not a function)
* `body` - Buffer or String
* `this` - Bind Client Object
* return - <b><code>Promise.resolve( { head, body } )</code></b> - `body` is Buffer

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
