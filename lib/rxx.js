module.exports.install = function(rx) {
  /**
    @param obs - Observable
    @param accum - Accumulator that returns an Observable that emits a single result
    @param initial - Initial value passed to accum.
  */
  rx.Observable.prototype.flatScan = function(accum, initial) {
    const resultSub = new rx.Subject();
    return this
      .zip(resultSub.merge(rx.Observable.just(initial)))
      .flatMap(x => accum(x[1], x[0]).take(1))
      .do(res => resultSub.onNext(res))
  };

  rx.Observable.prototype.debug = function(text) {
    return this.do(x => console.log(text, x));
  };

}
