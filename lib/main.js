'use strict';
/*
Usage: hive-mind [<local-ip>:<local-port>] [<remote-ip>:<remote-port> ...]
Example: hive-mind 32881 172.20.20.81:32790 123.45.6.78:41001

Local-ip does not specify the ip the port will be bound to, but instead
the ip that the server can be accessed by.

If local-port is not specified, a port will automatically be selected from
the ephemeral port range (32768 to 61000)
*/

process.stdout.setNoDelay(true);
const node = require('./node');
const Archiving = require('./archiving').Archiving;
const geneticAnnealing = require('./geneticAnnealing').geneticAnnealing;
const rxGeneticAnnealing = require('./rxGeneticAnnealing').rxGeneticAnnealing;
const rx = require('rx')

const Observable = rx.Observable;

function main() {
  const config = node.parseCommandLine(process.argv.slice(2), 0);
  if (config) {
    node.start(config);
  }
}




testFactor();
//main();
