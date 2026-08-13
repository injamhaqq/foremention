export type ProductTruthMetric = {
  id: string;
  label: string;
  source: string;
  sample: string;
  denominator: string;
  freshness: string;
  verification: string;
  scope: string;
  methodology: string;
};

export type ProductTruthInput = Omit<ProductTruthMetric, "id"> & { id?: string };

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const slug = (value: string) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Central customer-facing metric provenance contract.
 *
 * Product metrics should arrive at the UI with enough context to answer:
 * where did this number come from, how much evidence is behind it, how fresh
 * is it, has a human reviewed it, what workspace does it belong to, and what
 * measurement boundary applies. This helper does not invent missing context.
 */
export function productTruthMetric(input: ProductTruthInput): ProductTruthMetric {
  const metric: ProductTruthMetric = {
    id: clean(input.id || slug(input.label)),
    label: clean(input.label),
    source: clean(input.source),
    sample: clean(input.sample),
    denominator: clean(input.denominator),
    freshness: clean(input.freshness),
    verification: clean(input.verification),
    scope: clean(input.scope),
    methodology: clean(input.methodology),
  };
  for (const [field, value] of Object.entries(metric)) {
    if (!value) throw new Error(`Product truth is missing ${field}.`);
  }
  return metric;
}

export function productTruthForRunMetric(input: {
  id?: string;
  label: string;
  source: string;
  sample: string;
  denominator: string;
  collectedAt: string;
  verification: string;
  demo: boolean;
  methodology: string;
}) {
  return productTruthMetric({
    id: input.id,
    label: input.label,
    source: input.source,
    sample: input.sample,
    denominator: input.denominator,
    freshness: `Latest included collection: ${input.collectedAt}`,
    verification: input.verification,
    scope: input.demo ? "Fictional demo workspace only" : "Active organization and project only",
    methodology: input.methodology,
  });
}
