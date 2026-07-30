/**
 * 2PL expected-a-posteriori estimate on a standard-normal prior.
 * This puts different random OMIB forms on their published common scale.
 * It is an item-bank estimate with uncertainty, never an IQ or percentile.
 */
export function estimate2pl(items, responses, options = {}) {
  const minimum = options.minimum ?? -4;
  const maximum = options.maximum ?? 4;
  const step = options.step ?? 0.05;
  const points = [];
  let peak = -Infinity;

  for (let theta = minimum; theta <= maximum + step / 2; theta += step) {
    let logWeight = -0.5 * theta * theta; // standard-normal log prior, constant omitted
    for (const item of items) {
      const correct = responses[item.id] === item.solution ? 1 : 0;
      const probability = logistic(item.discrimination * (theta - item.difficulty));
      logWeight += correct
        ? Math.log(Math.max(probability, 1e-12))
        : Math.log(Math.max(1 - probability, 1e-12));
    }
    points.push({ theta, logWeight });
    peak = Math.max(peak, logWeight);
  }

  let weightSum = 0;
  let meanSum = 0;
  for (const point of points) {
    point.weight = Math.exp(point.logWeight - peak);
    weightSum += point.weight;
    meanSum += point.theta * point.weight;
  }
  const theta = meanSum / weightSum;
  let varianceSum = 0;
  for (const point of points) {
    varianceSum += ((point.theta - theta) ** 2) * point.weight;
  }
  const posteriorSe = Math.sqrt(varianceSum / weightSum);
  const information = items.reduce((total, item) => {
    const probability = logistic(item.discrimination * (theta - item.difficulty));
    return total + item.discrimination ** 2 * probability * (1 - probability);
  }, 0);
  return {
    theta,
    standardError: posteriorSe,
    information,
    correct: items.filter((item) => responses[item.id] === item.solution).length,
    total: items.length,
  };
}

function logistic(value) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exp = Math.exp(value);
  return exp / (1 + exp);
}
