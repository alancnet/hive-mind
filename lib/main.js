'use strict';
/*
Usage: hive-mind [<local-ip>:<local-port>] [<remote-ip>:<remote-port> ...]
Example: hive-mind 32881 172.20.20.81:32790 123.45.6.78:41001

Local-ip does not specify the ip the port will be bound to, but instead
the ip that the server can be accessed by.

If local-port is not specified, a port will automatically be selected from
the ephemeral port range (32768 to 61000)
*/

const Node = require('./node').Node;

function main() {
    const config = parseCommandLine(process.argv.slice(2), 0);
    if (config) {
        const node = new Node(config.local);
        node.on('listening', info => {
            const connectRemotes = () => {
                config.remotes.forEach(node.connect.bind(node));
            }
            setInterval(connectRemotes, 5000);
            connectRemotes();
        })
    }
}

function parseCommandLine(args) {
    function parsePort(str) {
        let ret = parseInt(str);
        if (!isNaN(ret) && ret >= 1 && ret <= 65535) return ret;
    }
    function parseRemote(str) {
        let vals = str.split(':');
        if (vals.length == 2) {
            let ip = vals[0];
            let port = parsePort(vals[1]);
            if (ip && port) return { ip, port }
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
}


main();
