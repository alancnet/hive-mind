"use strict";
const rx = require('rx')
const Observable = rx.Observable;
const Subject = rx.Subject;

function randomStream() {
    return Observable.just(0).repeat().map(x => {
      console.log("push");
      Math.random()
    });
}

class TrampolineScheduler extends rx.Scheduler.immediate.constructor {
  schedule(state, action) {
    setImmediate(_ => super.schedule(state, action));
  }
}

var timeoutScheduler = (function () {

  function scheduleNow(state, action) {
    var scheduler = this,
      disposable = new rx.SingleAssignmentDisposable();
    var id = scheduleMethod(function () {
      if (!disposable.isDisposed) {
        disposable.setDisposable(action(scheduler, state));
      }
    });
    return new rx.CompositeDisposable(disposable, disposableCreate(function () {
      clearMethod(id);
    }));
  }

  function scheduleRelative(state, dueTime, action) {
    var scheduler = this,
      dt = Scheduler.normalize(dueTime);
    if (dt === 0) {
      return scheduler.scheduleWithState(state, action);
    }
    var disposable = new rx.SingleAssignmentDisposable();
    var id = localSetTimeout(function () {
      if (!disposable.isDisposed) {
        disposable.setDisposable(action(scheduler, state));
      }
    }, dt);
    return new rx.CompositeDisposable(disposable, disposableCreate(function () {
      localClearTimeout(id);
    }));
  }

  function scheduleAbsolute(state, dueTime, action) {
    return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
  }

  return new rx.Scheduler(rx.helpers.defaultNow, rx.helpers.scheduleNow, rx.helpers.scheduleRelative, rx.helpers.scheduleAbsolute);
})();

function trampoline(obs) {
  const faucet = new Subject();

  const ret = obs
    .zip(faucet)
    .map(x => x[0])
    .do(_ => {
      setTimeout(_ => {
        faucet.onNext({})
      }, 10)
    })
    .observeOn(timeoutScheduler)

  const subscribe = ret.subscribe;
  ret.subscribe = function() {
    setImmediate(function() {
      faucet.onNext({})
    })
    return subscribe.apply(ret, arguments);
  };

  return ret.share();
}
module.exports = function() {
//  Observable.interval(1000).zip(randomStream()).forEach(x => console.log("x", x))
  trampoline(randomStream()).forEach(x => console.log(x));
}
