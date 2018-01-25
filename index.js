/* SOURCE FILE - Copyright (c) 2018 rpc-json - Tanase Laurentiu Iulian - https://github.com/RealTimeCom/rpc-json */

const Transform = require('stream').Transform;

const cache = { // cache common values
    n: Buffer.from('\r\n'), // header-body separator
    z: Buffer.allocUnsafe(0) // alloc an empty buffer
};
const init = { // init object values
    p: null, // data header request cache, next chunk is header
    w: true // connection is open?
};

class server extends Transform {
    constructor(f) {
        super();
        this._ = {
            f: typeof f === 'function' ? f.bind(this) : (response, head, body) => response(head, body), // cache server function
            e: 'serverError', // custom error event name
            c: cache.z // init empty cache buffer
        };
        Object.assign(this._, init);
    }
}
server.prototype._transform = trans;
server.prototype._flush = flush;

class client extends Transform {
    constructor(f) {
        super();
        this._ = {
            x: typeof f === 'function' ? f.bind(this) : undefined, // client filter function
            f: undefined, // cache client function
            e: 'clientError', // custom error event name
            c: cache.z // init empty cache buffer
        };
        Object.assign(this._, init);
    }
}
client.prototype._transform = trans;
client.prototype._flush = flush;

client.prototype.exec = async function(f, head, body) {
    this._.f = typeof f === 'function' ? f.bind(this) : undefined; // cache client function, reset to 'undefined' if none
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
                    if ('h' in p && 'l' in p && typeof p.l === 'number' && p.l >= 0) { // p.l - body length
                        const body = t._.c.slice(i + cache.n.length, i + cache.n.length + p.l);
                        if (body.length === p.l) { // body complete
                            t._.c = t._.c.slice(i + cache.n.length + p.l); // cache data left
                            if (t._.e === 'serverError') { // is server
                                t._.f(send.bind(t), p.h, body);
                            } else { // is client
                                if (typeof t._.x === 'function') { t._.x(t._.f, p.h, body); } // call client filter function
                                else if (typeof t._.f === 'function') { t._.f(p.h, body); } // call client function
                            }
                        } else { // need more data for body
                            t._.c = t._.c.slice(i + cache.n.length); // cache body part
                            t._.p = p; // cache header, next chunk is body
                        }
                        resolve();
                    } else {
                        t._.c = cache.z; // clear cache
                        t.push(null); // close connection
                        reject(new Error('invalid header'));
                    }
                } catch (e) { // JSON error
                    t._.c = cache.z; // clear cache
                    t.push(null); // close connection
                    reject(e);
                }
            } else {
                resolve();
            }
        } else { // chunk is body
            const p = t._.p,
                body = t._.c.slice(0, p.l);
            if (body.length === p.l) { // body complete
                t._.p = null; // next chunk is header
                t._.c = t._.c.slice(p.l); // cache data left
                if (t._.e === 'serverError') { // is server
                    t._.f(send.bind(t), p.h, body);
                } else { // is client
                    if (typeof t._.x === 'function') { t._.x(t._.f, p.h, body); } // call client filter function
                    else if (typeof t._.f === 'function') { t._.f(p.h, body); } // call client function
                }
            }
            resolve();
        }
    });
}

function send(head, body) {
    let t = this;
    return new Promise((resolve, reject) => {
        if (t._.w) {
            if (body === undefined) { body = cache.z; }
            if (!Buffer.isBuffer(body)) { // convert body value into Buffer
                body = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body + '');
            }
            try { // try JSON.stringify()
                t.push(Buffer.concat([Buffer.from(JSON.stringify({ h: head, l: body.length })), cache.n, body])); // 'l' is header value of the body length, see 'p.l' above
                resolve();
            } catch (e) { // JSON error
                reject(e);
            }
        } else {
            reject(new Error('call server response/send() after error'));
        }
    });
}

async function trans(chunk, enc, cb) {
    try {
        await parse(this, chunk); // parse chunk
    } catch (e) {
        this._.w = false;
        this.emit(this._.e, e);
    }
    cb();
}
async function flush(cb) {
    if (this._.c.length > 0) {
        try {
            await parse(this, cache.z); // parse data left
        } catch (e) {
            this._.w = false;
            this.emit(this._.e, e);
        }
    }
    cb();
}

module.exports = { server: server, client: client };