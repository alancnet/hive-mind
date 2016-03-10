const rx = require('rx');
const Observable = rx.Observable;
const Subject = rx.Subject;

const geneticAnnealing = {
    randomStream() {
        return Observable.just(0).repeat().map(x => Math.random());
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

        function toArray(obs) {
            var ret;
            obs.toArray().subscribe(x => ret = x);
            return ret;
        }
        function distinct(arr) {
            return toArray(
                Observable
                    .fromArray(arr)
                    .distinct()
            );
        }

        const loop = (parents, heat, generation) => {
            if (heat <= freezingPoint) return parents[0];
            else {
                const offspring = parents.map(config => createOffspring(config, heat))

                function getRichKids(offspring, pop, i) {
                    if (pop >= maxPopulation || i == offspring.length) return [];
                    else {
                        const richKids = getRichKids(offspring, pop + offspring[i].length, i + 1);
                        const ret = distinct(offspring[i].concat(richKids));
                        return ret;
                    }
                }

                const richKids = getRichKids(offspring, 0, 0);
                const randomSelection = toArray(
                    Observable.fromArray(
                        richKids
                    ).zip(this.randomStream())
                )
                    .sort((a, b) => a[1] - b[1])
                    .map(x => x[0])
                    .slice(0, maxPopulation)

                // Test
                const results = randomSelection.map(test)

                // Natural selection
                const nextGen = toArray(Observable.fromArray(results)
                    .zip(Observable.fromArray(randomSelection)))
                    .sort((a, b) => b[0] - a[0])

                return loop(
                    nextGen.slice(0, maxPopulation).map(x => x[1]),
                    heat * coolingFactor,
                    generation + 1
                )
            }
        }
        return loop([initialConfig], initialHeat, 1);
    }
}
module.exports.geneticAnnealing = geneticAnnealing;
