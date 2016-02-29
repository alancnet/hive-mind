'use strict';
const Subject = require('rx').Subject;

class LocalStreamingLog {
    constructor() {
        this._subject = new Subject();
        this._topics = {}; // Map[String, Observable[String]]
    }
    publish(topic, message) {
        //console.log(`topic: ${topic}; message: ${JSON.stringify(message)}`);
        this._subject.onNext({topic: topic, message: message});
    }

    getTopic(topic) {
        var ret = this._topics[topic];
        if (!ret) {
            ret = this._subject.filter(ev => ev.topic == topic).map(ev => ev.message);
            this._topics[topic] = ret;
        }
        return ret;
    }
}


module.exports.LocalStreamingLog = LocalStreamingLog;
