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
const Node = require('./node').Node;
const Archiving = require('./archiving').Archiving;
const geneticAnnealing = require('./geneticAnnealing').geneticAnnealing;
const rxGeneticAnnealing = require('./rxGeneticAnnealing').rxGeneticAnnealing;
const rx = require('rx')

//traceStack(rx, 'rx');
const Observable = rx.Observable;
const myTest = require('./myTest');
function main() {
  testRxGeneticAnnealing()
  return;

//    new Archiving().init();
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

function testGeneticAnnealing() {
    const res = geneticAnnealing.evolve(
        //initialConfig
        [1.0, 1.0],

        //createOffspring
        (config, heat) => {
            return [
                [config[0] + heat, config[1]],
                [config[0] - heat, config[1]],
                [config[0], config[1] + heat],
                [config[0], config[1] + heat]
            ]
        },

        //test
        config => -Math.abs(1.0 - ((config[0] / config[1]) - (config[1] / config[0]))),

        //maxPopulation
        5,

        //coolingFactor
        0.95,

        //initialHeat
        10.0,

        //freezingPoint
        0.000001
    )

    console.log(res);
    console.log(Math.abs(Math.max(res[0],res[1]) / Math.min(res[0],res[1])))

return;

}

function testRxGeneticAnnealing() {
    rxGeneticAnnealing.evolve(
        //initialConfig
        [1.0, 1.0],

        //createOffspring
        // (config, heat) => {
        //     return Observable.fromArray([
        //         [config[0] + heat, config[1]],
        //         [config[0] - heat, config[1]],
        //         [config[0], config[1] + heat],
        //         [config[0], config[1] + heat]
        //     ]);
        // },
        (config, heat) => {
          return Observable.generate(0, i => i < 1000, i => i++, _ => Math.random())
            .flatMap(rnd => [
                [config[0] + heat * rnd, config[1]],
                [config[0] - heat * rnd, config[1]],
                [config[0], config[1] + heat * rnd],
                [config[0], config[1] + heat * rnd]
            ]);
        },

        //test
        config => Observable.just(
          -Math.abs(1.0 - ((config[0] / config[1]) - (config[1] / config[0])))
        ),

        //maxPopulation
        5,

        //coolingFactor
        0.95,

        //initialHeat
        10.0,

        //freezingPoint
        0.000000000000001
    )
    .doOnCompleted(_ => {
      console.log("Completed");
    })
    .forEach(res => {
        console.log(Math.abs(Math.max(res[0],res[1]) / Math.min(res[0],res[1])), res)
    });

return;

}





function traceStack(lib, name) {
  var depth = 0;
  console.log(`Scanning ${name}`);
  if (lib.hasOwnProperty('_traceStack')) return;
  Object.defineProperty(lib, '_traceStack', {});
  for (var key in lib) {
    if (lib.hasOwnProperty(key)) {
      var val = lib[key];
      switch (typeof val) {
        case "object": traceStack(val, `${name}.${key}`); break;
        case "function":
          (function(oldFunc, key) {
            var fname = `${name}.${key}`;
            console.log(`Replacing ${fname}`);
            var newFunc = function() {
              depth++;
              if (depth > 20) debugger;
              console.log(new Array(depth).join('-') + fname);
              var ret = oldFunc.apply(this, arguments);
              depth--;
              return ret;
            }
            lib[key] = newFunc;
            traceStack(oldFunc, fname);
            if (oldFunc.prototype) traceStack(oldFunc.prototype, `${fname}.prototype`);
            for (var subKey in oldFunc) {
              if (oldFunc.hasOwnProperty(subKey)) {
                newFunc[subKey] = oldFunc[subKey];
              }
            }
          })(val, key);

          break;
      }
    }
  }
}







main();
