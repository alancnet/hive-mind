'use strict';
const _ = require('lodash');
const uuid = require('uuid');
const Server = require('masterless-msgpack');
const EventEmitter = require('events').EventEmitter;
const LocalStreamingLog = require('./localstreaminglog').LocalStreamingLog

class Node extends EventEmitter {
  constructor(address, id) {
    super();
    this.ip = address.ip;
    this.config = {
      port: address.port
    };
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

    // RxRpc stuff
    this.cycle = 0;
    this.remotes = [];

    this.eventBus.getTopic('peerConnect').forEach(ev => {
      const rpc = new RxRpc({
        provider: this
      });
      this.remotes.push(rpc);
      this.eventBus.getTopic('peerDisconnect').filter(x => x.id === ev.id).forEach(ev => {
        delete this.remotes[ev.id];
      })
    });

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
          port: port,
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
          this.emit('listening', {
            server,
            port,
            uri
          });
        })
        server.on('connect', this._peerConnect.bind(this));
        server.on('message', this._onMessage.bind(this));
        server.on('disconnect', id => {
          // console.log(`peer lost: ${id}`);
          delete this.peers[id];
          this.eventBus.publish('peerDisconnect', {
            id
          });
        })
      }
    }

    listen(this.config.port || 32768, !!this.config.port);
  }

  _onAnnounce(envelope) {
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
      this.eventBus.publish('peerConnect', {
        id: envelope.message.id
      });
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

  apply(name, args) {
    if (this.remotes.length == 0) {
      // No remotes connected. Resolve locally.
      const ret = this[name].apply(this, args);
      if (ret && typeof ret.subscribe === 'function') return ret;
      else return Observable.just(ret);
    } else {
      // Cycle through remotes to spread out load.
      this.cycle = (this.cycle + 1) % this.remotes.length;
      const remote = this.remotes[this.cycle];
      return remote.apply(name, args).subscribe(ret);
    }
  }

  call(name, arg) {
    const args = [];
    for (let i = 1; i < arguments.length; i++)
      args.push(arguments[i]);
    return this.apply(name, args);
  }

}

module.exports.start = function(config) {
  const node = new Node(config.local);
  node.on('listening', info => {
    const connectRemotes = () => {
      config.remotes.forEach(node.connect.bind(node));
    }
    setInterval(connectRemotes, 5000);
    connectRemotes();
  })
  return node;
}

module.exports.parseCommandLine = function parseCommandLine(args) {
  function parsePort(str) {
    let ret = parseInt(str);
    if (!isNaN(ret) && ret >= 1 && ret <= 65535) return ret;
  }

  function parseRemote(str) {
    let vals = str.split(':');
    if (vals.length == 2) {
      let ip = vals[0];
      let port = parsePort(vals[1]);
      if (ip && port) return {
        ip,
        port
      }
    }
  }
  try {
    var config = {
      local: parseRemote(args[0]),
      remotes: args.slice(1).map(parseRemote)
    };
    return config;
  } catch (ex) {
    console.info(`hive-mind [<local-ip>:<local-port>] [<remote-ip>:<remote-port> ...]`)
    return null;
  }
};

module.exports.Node = Node;
