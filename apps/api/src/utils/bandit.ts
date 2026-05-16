export interface Variant {
  id: string;
  sends: number;
  opens: number;
  subject: string;
  body_html?: string | null;
  body_text?: string | null;
}

/**
 * Samples from Beta distribution using Gamma distributions.
 * Beta(a, b) = G(a, 1) / (G(a, 1) + G(b, 1))
 */
function sampleBeta(a: number, b: number): number {
  const g1 = sampleGamma(a);
  const g2 = sampleGamma(b);
  return g1 / (g1 + g2);
}

/**
 * Samples from Gamma(a, 1) distribution using Marsaglia and Tsang method.
 */
function sampleGamma(a: number): number {
  if (a < 1) {
    return sampleGamma(a + 1) * Math.pow(Math.random(), 1 / a);
  }

  const d = a - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x, v, u;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    u = Math.random();

    if (u < 1 - 0.0331 * x * x * x * x) {
      return d * v;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Box-Muller transform for normal distribution.
 */
function normalRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Multi-Armed Bandit using Thompson Sampling.
 * Picks the best variant based on Beta distribution samples.
 */
export function pickVariant<T extends Variant>(variants: T[]): T {
  if (variants.length === 0) {
    throw new Error('No variants provided');
  }
  
  if (variants.length === 1) {
    return variants[0];
  }

  let bestVariant = variants[0];
  let maxSample = -1;

  for (const variant of variants) {
    // alpha = successes + 1, beta = failures + 1
    const alpha = variant.opens + 1;
    const beta = Math.max(0, variant.sends - variant.opens) + 1;
    const sample = sampleBeta(alpha, beta);

    if (sample > maxSample) {
      maxSample = sample;
      bestVariant = variant;
    }
  }

  return bestVariant;
}
