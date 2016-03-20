const rx = require('rx');
const rxx = require('./rxx');
const Observable = rx.Observable;
const Subject = rx.Subject;

rxx.install(rx);

const rxGeneticAnnealing = {
    //
    // randomStream() {
    //     return Observable.just(0).repeat().map(x => Math.random());
    // },

    heatStream(initialHeat, coolingFactor, freezingPoint) {
      const arr = [initialHeat];
      while ((arr[arr.length] = arr[arr.length - 1] * coolingFactor) > freezingPoint) {
      }
      return Observable.fromArray(arr);
    },

    /**
    @param {object} initialConfig - Initial AI configuration
    @param {function} createOffspring - (config, number) => Array[object] Given
                a parent configuration and a random delta, generate offspring.
    @param {function} test - function(config) => number) Given a configuration,
                test it, and return a score.
    @param {number} maxPopulation - Max number of offspring to appear in a
                generation.
    @param {number} coolingFactor - Multiplier applied to heat each generation.
    @param {number} initialHeat - Initial range of the random deltas.
    @param {number} freezingPoint - Heat point when the algorithm should stop.
    */
    evolve(
        initialConfig,
        createOffspring,
        test,
        maxPopulation,
        coolingFactor,
        initialHeat,
        freezingPoint
    ) {
      // Annealing.. Reduce heat
      // If heat <= freezing point, return best options
      // else, not frozen yet
      // Produce offspring
      // Reap next generation from offspring of best fit parents
      // Produce random selection from next generation.. This may be redundant
      // Test.. Map randomSelection to test
      // Natural selection.. Rank each offspring by its test result
      // Rinse and repeat

      // Start with heat stream
      // Create function that takes heat and config and returns a stream of results
      // Solve interaction

      return this
        .heatStream(initialHeat, coolingFactor, freezingPoint)
        .flatScan((configs, heat) => {
          return Observable.fromArray(configs)
            // Produce
            .flatMap(config => createOffspring(config, heat))
            .take(maxPopulation)
            // test
            .flatMap(config => test(config).map(result => ({config, result})))
            // sort
            .toArray()
            .flatMap(arr =>
              Observable.fromArray(
                arr.sort((a, b) => b.result - a.result)
              )
            )
            // Cull to max population
            .take(maxPopulation)
            // Take the config
            .map(x => x.config)
            .toArray()

        }, [initialConfig]
      )

      // Take best configs
      .map(configs => configs[0])
    }
}

module.exports.rxGeneticAnnealing = rxGeneticAnnealing;
