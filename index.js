/* SOURCE FILE - Copyright (c) 2017 rpc-json - Tanase Laurentiu Iulian - https://github.com/RealTimeCom/rpc-json */
'use strict';

const Transform = require('stream').Transform;

class server extends Transform {
    constructor(f) {
        super();
        this.f = f; // cache server function
        this.n = Buffer.from('\r\n');
        this.e = 'serverError';
        this.h = true; // data is header?
        this.z = Buffer.allocUnsafeSlow(0); // create an un-pooled empty buffer
        this.c = this.z; // init empty cache buffer
        this.p = {}; // data header request cache
        this.w = true; // connection is open?
    }
}

server.prototype._transform = function(chunk, enc, cb) {
    parse.bind(this)(chunk, true); // parse chunk, true = is server
    cb();
};
server.prototype._flush = function(cb) {
    this.w = false; // connection closed
    if (this.c.length > 0) { parse.bind(this)(this.z, true); } // parse data left, true = is server
    cb();
};

class client extends Transform {
    constructor() {
        super();
        this.f = undefined;
        this.n = Buffer.from('\r\n');
        this.e = 'clientError';
        this.h = true; // data is header?
        this.z = Buffer.allocUnsafeSlow(0); // create an un-pooled empty buffer
        this.c = this.z; // init empty cache buffer
        this.p = {}; // data header request cache
        this.w = true; // connection is open?
    }
}
client.prototype._transform = function(chunk, enc, cb) {
    parse.bind(this)(chunk, false); // parse chunk, false = is client
    cb();
};
client.prototype._flush = function(cb) {
    this.w = false; // connection closed
    if (this.c.length > 0) { parse.bind(this)(this.z, false); } // parse data left, false = is client
    cb();
};
client.prototype.exec = function(f, head, body) {
    this.f = f; // cache client function
    send.bind(this)(head, body);
    return this;
};

function parse(chunk, server) { // type server ?
    this.c = Buffer.concat([this.c, chunk]);
    if (this.h) { // chunk is header
        this.p = {}; // init/reset this.p
        const i = this.c.indexOf(this.n); // search for separator
        if (i !== -1) { // separator is found
            const h = this.c.slice(0, i).toString().trim();
            try {
                const p = JSON.parse(h);
                if ('h' in p && 'l' in p && typeof p.l === 'number' && p.l >= 0) {
                    const body = this.c.slice(i + this.n.length);
                    if (body.length >= p.l) { // body complete
                        if (body.length > p.l) {
                            body = body.slice(0, p.l);
                            this.c = body.slice(p.l); // cache remaining bytes, for the next request
                        } else { // empty cache
                            this.c = this.z;
                        }
                        if (server) {
                            if (this._readableState.pipes.pause) { this._readableState.pipes.pause(); } // pause socket until server response back
                            this.f(send.bind(this), p.h, body);
                        } else {
                            this.f(p.h, body);
                        }
                    } else { // need more data for body
                        this.p = p; // cahce header
                        this.h = false; // next chunk is body
                        this.c = body; // save body part to cache
                    }
                } else {
                    this.emit(this.e, new Error('Invalid Header'));
                    this.c = this.z;
                    if (this.w) { this.push(null); }
                }
            } catch (e) {
                this.emit(this.e, e);
                this.c = this.z;
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
                this.c = this.z; // empty cache
            }
            this.h = true; // next chunk is header
            if (server) { // is server
                if (this._readableState.pipes.pause) { this._readableState.pipes.pause(); } // pause socket until server response back
                this.f(send.bind(this), this.p.h, body); // call server function
            } else { // is client
                this.f(this.p.h, body); // call client function
            }
        } // need more bytes for body
    }
}

function send(head, body) {
    if (this.w) {
        if (body !== undefined && !Buffer.isBuffer(body)) { body = Buffer.from(body); }
        this.push(Buffer.concat([Buffer.from(JSON.stringify({ h: head, l: body.length })), this.n, body]));
        if (this._readableState.pipes.resume) { this._readableState.pipes.resume(); }// resume socket, get more data
    }
}

module.exports = { server: server, client: client };
