'use strict';
const z = require('bauer-zip');
const fs = require('fs');
const EventEmitter = require('events').EventEmitter;
const Observable = require('rx').Observable;
const Subject = require('rx').Subject;
const temp = require('temp');
const RxRpc = require('rx-rpc').RxRpc;


class Archiving extends EventEmitter {
    constructor() {
        super();
        this.home = process.cwd()
        this.archives = temp.mkdirSync('archiving');
        console.log(this.archives);
    }
    init() {
        const zipFile = this.archives + '/app.zip';
        z.zip(this.home, zipFile, (err) => {
            fs.readFile(zipFile, (err, data) => {
                console.log(data);
                fs.unlinkSync(zipFile);
            })
        });
    }
    // modulePathOf(mod) {
    //     return `${this.nodeModules}/${mod}`;
    // }
    // zipFileOf(mod) {
    //     return `${this.archives}/${mod}.zip`;
    // }
    // init() {
    //     if (!fs.existsSync(this.archives)) {
    //         fs.mkdirSync(this.archives);
    //     }
    //     fs.readdir(this.nodeModules, (err, modules) => {
    //         const faucet = new Subject();
    //         Observable.from(modules)
    //             .filter(name => name != ".zip")
    //             .zip(faucet).map(pair => pair[0])
    //             .forEach(mod => {
    //                 const zipFile = this.zipFileOf(mod);
    //                 const modulePath = this.modulePathOf(mod);
    //                 fs.exists(zipFile, exists => {
    //                     if (!exists) {
    //                         console.log(`Zipping ${mod}`);
    //                         z.zip(modulePath, zipFile, err => {
    //                             if (err) console.error(err);
    //                             else faucet.onNext();
    //                         })
    //                     } else {
    //                         faucet.onNext();
    //                     }
    //                 })
    //             })
    //         faucet.onNext();
    //     })
    // }
}


module.exports.Archiving = Archiving;
