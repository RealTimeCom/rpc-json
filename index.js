/* SOURCE FILE - Copyright (c) 2018 rpc-json - Tanase Laurentiu Iulian - https://github.com/RealTimeCom/rpc-json */

const Transform = require('stream').Transform;

const cache = { // cache common values
    n: Buffer.from('\r\n'), // header-body separator
    z: Buffer.allocUnsafe(0) // alloc an empty buffer
};
const init = { // init object values
    p: null, // data header request cache, next chunk is header
    w: true, // connection is open?
    c: cache.z // init empty cache buffer
};

class server extends Transform {
    constructor(f) {
        super();
        this._ = {
            f: typeof f === 'function' ? f.bind(this) : async (response, head, body) => await response(head, body), // cache server function
            e: 'serverError' // custom error event name
        };
        Object.assign(this._, init);
    }
}
server.prototype._transform = trans;
server.prototype._flush = flush;

class client extends Transform {
    constructor() {
        super();
        this._ = {
            resolve: undefined, // Promise resolve function
            reject: undefined, // Promise reject function
            e: 'clientError' // custom error event name
        }
        Object.assign(this._, init);
    }
}
client.prototype._transform = trans;
client.prototype._flush = flush;

client.prototype.exec = async function(head, body) {
    return await send.bind(this)(head, body);
};

function parse(t, chunk) {
    return new Promise((resolve, reject) => {
        t._.c = Buffer.concat([t._.c, chunk]);
        if (t._.p === null) { // chunk is header
            const i = t._.c.indexOf(cache.n); // search for separator
            if (i !== -1) { // separator is found
                const h = t._.c.slice(0, i).toString().trim();
                try { // try JSON.parse()
                    const p = JSON.parse(h);
                    if (!('h' in p)) { p.h = undefined; } // head not found, set to 'undefined'
                    if ('l' in p && typeof p.l === 'number' && p.l >= 0) { // p.l - body length
                        const body = t._.c.slice(i + cache.n.length, i + cache.n.length + p.l);
                        if (body.length === p.l) { // body complete
                            t._.c = t._.c.slice(i + cache.n.length + p.l); // cache data left
                            if (t._.e === 'serverError') { // is server
                                t._.f(send.bind(t), p.h, body).then(resolve).catch(reject);
                            } else { // is client
                                if (t._.resolve) { t._.resolve({ head: p.h, body: body }); } // send().resolve
                                resolve(); // parse().resolve
                            }
                        } else { // need more data for body
                            t._.c = t._.c.slice(i + cache.n.length); // cache body part
                            t._.p = p; // cache header, next chunk is body
                            resolve();
                        }
                    } else {
                        t._.c = cache.z; // clear cache
                        t._.w = false; // prevent sending more data after push(null)
                        t.push(null); // close connection
                        if (t._.reject) { t._.reject(new Error('invalid header')); }
                        reject(new Error('invalid header')); // will emit() error event
                    }
                } catch (e) { // JSON error
                    t._.c = cache.z; // clear cache
                    t._.w = false; // prevent sending more data after push(null)
                    t.push(null); // close connection
                    if (t._.reject) { t._.reject(e); }
                    reject(e); // will emit() error event
                }
            } else { // need more data for header
                resolve();
            }
        } else { // chunk is body
            const p = t._.p,
                body = t._.c.slice(0, p.l);
            if (body.length === p.l) { // body complete
                t._.p = null; // next chunk is header
                t._.c = t._.c.slice(p.l); // cache data left
                if (t._.e === 'serverError') { // is server
                    t._.f(send.bind(t), p.h, body).then(resolve).catch(reject);
                } else { // is client
                    if (t._.resolve) { t._.resolve({ head: p.h, body: body }); } // send().resolve
                    resolve(); // parse().resolve
                }
            } else {
                resolve();
            }
        }
    });
}

function send(head, body) {
    let t = this;
    return new Promise((resolve, reject) => {
        if (t._.w) { // connection is open
            if (body === undefined) { body = cache.z; }
            if (!Buffer.isBuffer(body)) { // convert body value into Buffer
                body = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body + '');
            }
            try { // try JSON.stringify()
                const h = JSON.stringify({ h: head, l: body.length }); // 'l' is header value of the body length, see 'p.l' above
                if (t._.e !== 'serverError') { // is client, resolve after server response
                    t._.resolve = resolve;
                    t._.reject = reject;
                }
                t.push(Buffer.concat([Buffer.from(h), cache.n, body]));
                if (t._.e === 'serverError') { resolve(); } // is server
            } catch (e) { // JSON error
                reject(e);
            }
        } else { // connection is close
            reject(new Error('can not send data after close'));
        }
    });
}

async function trans(chunk, enc, cb) {
    try {
        await parse(this, chunk); // parse chunk
    } catch (e) {
        this.emit(this._.e, e);
    }
    cb();
}
async function flush(cb) {
    this._.w = false; // connection is closed, prevent sending more data
    if (this._.c.length > 0) {
        try {
            await parse(this, cache.z); // parse data left
        } catch (e) {
            this.emit(this._.e, e);
        }
    }
    cb();
}

module.exports = { server: server, client: client };