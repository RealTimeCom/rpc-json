/* SOURCE FILE - Copyright (c) 2017 rpc-json - Tanase Laurentiu Iulian - https://github.com/RealTimeCom/rpc-json */
'use strict';

const Transform = require('stream').Transform;

const cache = { // cache common values
    n: Buffer.from('\r\n'), // header-body separator
    z: Buffer.allocUnsafeSlow(0) // create an un-pooled empty buffer
};
const init = { // init object values
    h: true, // data is header?
    p: {}, // data header request cache
    w: true // connection is open?
};

class server extends Transform {
    constructor(f) {
        super();
        Object.assign(this, init);
        this.f = typeof f === 'function' ? f.bind(this) : (response, head, body) => response(head, body); // cache server function
        this.e = 'serverError'; // custom error event name
        this.c = cache.z; // init empty cache buffer
    }
}
server.prototype._transform = trans;
server.prototype._flush = flush;

class client extends Transform {
    constructor() {
        super();
        Object.assign(this, init);
        this.f = undefined;
        this.e = 'clientError'; // custom error event name
        this.c = cache.z; // init empty cache buffer
    }
}
client.prototype._transform = trans;
client.prototype._flush = flush;

client.prototype.exec = function(f, head, body) {
    this.f = typeof f === 'function' ? f.bind(this) : undefined; // cache client function
    send.bind(this)(head, body);
    return this;
};

function parse(chunk) {
    this.c = Buffer.concat([this.c, chunk]);
    if (this.h) { // chunk is header
        this.p = {}; // init/reset this.p
        const i = this.c.indexOf(cache.n); // search for separator
        if (i !== -1) { // separator is found
            const h = this.c.slice(0, i).toString().trim();
            try { // try JSON.parse()
                const p = JSON.parse(h);
                if ('h' in p && 'l' in p && typeof p.l === 'number' && p.l >= 0) {
                    const body = this.c.slice(i + cache.n.length);
                    if (body.length >= p.l) { // body complete
                        if (body.length > p.l) {
                            body = body.slice(0, p.l);
                            this.c = body.slice(p.l); // cache remaining bytes, for the next request
                        } else { // empty cache
                            this.c = cache.z;
                        }
                        if (this.e === 'serverError') { // is server
                            if (this._readableState.pipes.pause) { this._readableState.pipes.pause(); } // pause socket until server response back
                            this.f(send.bind(this), p.h, body);
                        } else {
                            if (typeof this.f === 'function') { this.f(p.h, body); }
                        }
                    } else { // need more data for body
                        this.p = p; // cahce header
                        this.h = false; // next chunk is body
                        this.c = body; // save body part to cache
                    }
                } else {
                    this.emit(this.e, new Error('Invalid Header'));
                    this.c = cache.z;
                    if (this.w) { this.push(null); }
                }
            } catch (e) {
                this.emit(this.e, e);
                this.c = cache.z;
                if (this.w) { this.push(null); }
            }
        } // need more data
    } else { // chunk is body
        if (this.c.length >= this.p.l) { // body complete
            let body;
            if (this.c.length > this.p.l) {
                body = this.c.slice(0, this.p.l);
                this.c = this.c.slice(this.p.l); // cache remaining bytes, for next request
            } else {
                body = this.c;
                this.c = cache.z; // empty cache
            }
            this.h = true; // next chunk is header
            if (this.e === 'serverError') { // is server
                if (this._readableState.pipes.pause) { this._readableState.pipes.pause(); } // pause socket until server response back
                this.f(send.bind(this), this.p.h, body); // call server function
            } else { // is client
                if (typeof this.f === 'function') { this.f(this.p.h, body); } // call client function
            }
        } // need more bytes for body
    }
}

function send(head, body) {
    if (this.w) {
        if (body === undefined) { body = cache.z; }
        if (!Buffer.isBuffer(body)) { // convert body value into Buffer
            body = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body + '');
        }
        try { // try JSON.stringify()
            this.push(Buffer.concat([Buffer.from(JSON.stringify({ h: head, l: body.length })), cache.n, body]));
            if (this._readableState.pipes.resume) { this._readableState.pipes.resume(); } // resume socket, get more data
        } catch (e) {
            this.emit(this.e, e);
            this.c = cache.z;
            this.push(null);
        }
    }
}

function trans(chunk, enc, cb) {
    parse.bind(this)(chunk); // parse chunk
    cb();
}
function flush(cb) {
    this.w = false; // connection closed
    if (this.c.length > 0) { parse.bind(this)(cache.z); } // parse data left
    cb();
}

module.exports = { server: server, client: client };
