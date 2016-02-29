'use strict';
const _ = require('lodash');
const uuid = require('uuid');
const Server = require('masterless');
const EventEmitter = require('events').EventEmitter;
const LocalStreamingLog = require('./localstreaminglog').LocalStreamingLog

class Node extends EventEmitter {
    constructor(address, id) {
        super();
        this.ip = address.ip;
        this.config = { port: address.port };
        this.id = id || uuid.v1();
        this._listen();
        this.peers = {};
        this.eventBus = new LocalStreamingLog();
        this.on('listening', (ev) => {
            // console.log(`Server active: ${this.id}`);
            this.server = ev.server;
            this.port = ev.port;
            this.uri = ev.uri;

        })

        this.eventBus.getTopic('Announce').subscribe(this._onAnnounce.bind(this));
        //this.eventBus.getTopic('')
    }

    connect(remote) {
        if (this.server && !_.find(_.values(this.peers), peer => peer.ip == remote.ip && peer.port == remote.port)) {
            const uri = `tcp://${remote.ip}:${remote.port}`;
            // console.log(`Connecting to ${uri}`);
            this.server.connect(uri);
        }
    }

    emit(event) {
        //console.log(`emit:`, arguments);
        return super.emit.apply(this, arguments);
    }

    _listen() {
        var listen = (port, search) => {
            if (search && port > 61000) {
                this.emit('error', new Error('Unable to find available port in ephemeral range.'));
            } else {
                let server = new Server(this.id, {
                    port: port ,
                    debug: function() {
                        const sb = [];
                        for (let i = 0; i < arguments.length; i++) {
                            sb.push(arguments[i]);
                        }
                        // console.log(`debug: ${sb.join(' ')}`);
                    }
                });
                server._server.on('error', err => {
                    if (search && err.code == 'EADDRINUSE') {
                        listen(port + 1, search);
                    } else {
                        this.emit('error', err);
                    }
                })
                server.on('listening', uri => {
                    this.emit('listening', { server, port, uri });
                })
                server.on('connect', this._peerConnect.bind(this));
                server.on('message', this._onMessage.bind(this));
                server.on('disconnect', id => {
                    // console.log(`peer lost: ${id}`);
                    delete this.peers[id];
                })
            }
        }

        listen(this.config.port || 32768, !!this.config.port);
    }

    _onAnnounce (envelope) {
        // Connect to peer if not connected
        if (!this.peers.hasOwnProperty(envelope.message.id)) {
            this.connect(envelope.message);
        }
        // Update peers collection if this is a direct connection
        if (envelope.source == envelope.message.id) {
            console.info(`Peer connected: ${envelope.source}, ${envelope.message.ip}:${envelope.message.port}`);
            this.peers[envelope.message.id] = {
                ip: envelope.message.ip,
                port: envelope.message.port
            };
        }
        // Forward envelope on to all peers
        _.forEach(this.peers, (value, id) => {
            if (id != envelope.message.id && id != envelope.source && envelope.trace.indexOf(id) == -1) {
                this._send(id, envelope);
            }
        })

    }

    _onMessage(source, envelope) {
        console.log(`recv ${source}:`, JSON.stringify(envelope));
        envelope.source = source;
        envelope.trace.push(this.id);

        try {
            this.eventBus.publish(envelope.topic, envelope);
        } catch (ex) {
            console.error(ex);
        }
    }

    _peerConnect(id) {
        this.server.keep(id, true);
        if (this.peers.hasOwnProperty(id)) throw new Error("Duplicate peer");
        this._send(id, {
            topic: 'Announce',
            trace: [id],
            message: {
                id: this.id,
                ip: this.ip,
                port: this.port
            }
        });
        this.peers[id] = {};
    }

    _send(id, message) {
        console.log(`send ${id}:`, JSON.stringify(message));
        try {
            if (!this.server.send(id, message)) {
                console.log("Message not sent");
            }
        } catch (ex) {
            console.error(ex);
        }
    }

}
module.exports.Node = Node;
