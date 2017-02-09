/* SOURCE FILE - Copyright (c) 2017 rpc-json - Tanase Laurentiu Iulian - https://github.com/RealTimeCom/rpc-json */
'use strict';

const Transform = require('stream').Transform;

const cache = { // cache common values
    n: Buffer.from('\r\n'), // header-body separator
    z: Buffer.allocUnsafeSlow(0) // create an un-pooled empty buffer
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

client.prototype.exec = function(f, head, body) {
    this._.f = typeof f === 'function' ? f.bind(this) : undefined; // cache client function, reset to 'undefined' if none
    send.bind(this)(undefined, head, body);
    return this;
};

function parse(chunk, cb) {
    this._.c = Buffer.concat([this._.c, chunk]);
    if (this._.p === null) { // chunk is header
        const i = this._.c.indexOf(cache.n); // search for separator
        if (i !== -1) { // separator is found
            const h = this._.c.slice(0, i).toString().trim();
            try { // try JSON.parse()
                const p = JSON.parse(h);
                if ('h' in p && 'l' in p && typeof p.l === 'number' && p.l >= 0) { // p.l - body length
                    const body = this._.c.slice(i + cache.n.length, i + cache.n.length + p.l);
                    if (body.length === p.l) { // body complete
                        this._.c = this._.c.slice(i + cache.n.length + p.l); // cache data left
                        if (this._.e === 'serverError') { // this is server
                            this._.f(send.bind(this, cb), p.h, body);
                        } else { // this is client
                            if (typeof this._.x === 'function') { this._.x(this._.f, p.h, body); } // call client filter function
                            else if (typeof this._.f === 'function') { this._.f(p.h, body); } // call client function
                            cb(); // next
                        }
                    } else { // need more data for body
                        this._.c = this._.c.slice(i + cache.n.length); // cache body part
                        this._.p = p; // cache header, next chunk is body
                        cb(); // next
                    }
                } else {
                    this.emit(this._.e, new Error('Invalid Header'));
                    this._.c = cache.z;
                    this.push(null);
                    cb();
                }
            } catch (e) { // JSON error
                this.emit(this._.e, e);
                this._.c = cache.z;
                this.push(null);
                cb();
            }
        } else {
            cb(); // need more data for header
        }
    } else { // chunk is body
        const p = this._.p, body = this._.c.slice(0, p.l);
        if (body.length === p.l) { // body complete
            this._.p = null; // next chunk is header
            this._.c = this._.c.slice(p.l); // cache data left
            if (this._.e === 'serverError') { // this is server
                this._.f(send.bind(this, cb), p.h, body);
            } else { // this is client
                if (typeof this._.x === 'function') { this._.x(this._.f, p.h, body); } // call client filter function
                else if (typeof this._.f === 'function') { this._.f(p.h, body); } // call client function
                cb(); // next
            }
        } else {
            cb(); // need more data for body
        }
    }
}

function send(cb, head, body) {
    if (this._.w) {
        if (body === undefined) { body = cache.z; }
        if (!Buffer.isBuffer(body)) { // convert body value into Buffer
            body = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body + '');
        }
        try { // try JSON.stringify()
            this.push(Buffer.concat([Buffer.from(JSON.stringify({ h: head, l: body.length })), cache.n, body])); // 'l' is header value of the body length, see 'p.l' above
        } catch (e) { // JSON error
            this.emit(this._.e, e);
            this._.c = cache.z;
            this.push(null);
        }
        if (cb) { cb(); }
    }
}

function trans(chunk, enc, cb) {
    parse.bind(this)(chunk, cb); // parse chunk
}
function flush(cb) {
    this._.w = false; // connection closed
    if (this._.c.length > 0) {
        parse.bind(this)(cache.z, cb); // parse data left
    } else {
        cb();
    }
}

module.exports = { server: server, client: client };
