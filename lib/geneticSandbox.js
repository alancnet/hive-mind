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
  console.log(Math.abs(Math.max(res[0], res[1]) / Math.min(res[0], res[1])))

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
      config => Observable.just(-Math.abs(1.0 - ((config[0] / config[1]) - (config[1] / config[0])))),

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
      console.log(Math.abs(Math.max(res[0], res[1]) / Math.min(res[0], res[1])), res)
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
        case "object":
          traceStack(val, `${name}.${key}`);
          break;
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



function testFactor() {
  function getPrimes(max) {
    var sieve = [],
      i, j, primes = [];
    for (i = 2; i <= max; ++i) {
      if (!sieve[i]) {
        // i has not been marked -- it is prime
        primes.push(i);
        for (j = i << 1; j <= max; j += i) {
          sieve[j] = true;
        }
      }
    }
    return primes;
  }
  const primes = getPrimes(
    30000 //000
  );
  const coldPrimes = Observable.fromArray(primes);
  const products = Observable.generate(
    0,
    i => i < 1000,
    i => ++i,
    i => primes[Math.floor(Math.random() * primes.length)] * primes[Math.floor(Math.random() * primes.length)]
  )

  function factorize(n, x1, x2, y1, y2) {
    const left = Observable.fromArray(primes.slice(x1, x2));
    const right = Observable.fromArray(primes.slice(y1, y2));

    return left.join(right, _ => Observable.never(), _ => Observable.never(), (x, y) => [x, y]) //.do(x => console.log(`${x[0]} * ${x[1]} = ${x[0] * x[1]}`))
      .filter(x => x[0] * x[1] === n);
  }

  function genParams(as, depth, md) {
    var ret = as.map(a => {
      const x1 = a[0],
        x2 = a[1],
        y1 = a[2],
        y2 = a[3];
      const xm = Math.floor((x1 + x2) / 2),
        ym = Math.floor((y1 + y2) / 2);
      if (depth >= md / 2) {
        // Split the x's
        return [
          [x1, xm, Math.max(x1, y1), y2], // Boost y1 to exclude repeat operations
          [xm, x2, Math.max(x1, y1), y2]
        ]
      } else {
        // Split the Y's
        return [
          [x1, x2, y1, ym],
          [x1, x2, ym, y2]
        ]
      }
    }).reduce((pv, cv) => pv.concat(cv), [])
    if (depth == 0 || ret.length == as.length) return ret;
    else return genParams(ret, depth - 1, md || depth);
  }

  //  console.log(genParams([[0, primes.length, 0, primes.length]], 4));
  //products.forEach( x => console.log(x));

  products.take(10).flatMap(product => {
    const pmax = product / 2
      // Find index of max prime to use
    var maxi = primes.length;
    // for (maxi = 0; maxi < primes.length; maxi++) {
    //   if (primes[maxi] > pmax) break;
    // }
    const allParams = genParams([
      [0, maxi, 0, maxi]
    ], 4);
    const params = Observable.fromArray(allParams)
    return params.flatMap(a => factorize(product, a[0], a[1], a[2], a[3]))
      .take(1)
      .map(x => [product].concat(x))
  }).forEach(x => console.log(x));
  //factorize(10).forEach(x => console.log(x))
}
