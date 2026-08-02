export type BrandMentionContext = { sentence: string; paragraph: string };

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

export function extractBrandMentionContexts(answer: string, brand: string): BrandMentionContext[] {
  const target = normalize(brand).toLocaleLowerCase();
  if (!target || !answer.trim()) return [];
  const paragraphs = answer.split(/\n\s*\n|\r\n\s*\r\n/).map(normalize).filter(Boolean);
  const contexts: BrandMentionContext[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.toLocaleLowerCase().includes(target)) continue;
    const sentences = paragraph.match(/[^.!?]+(?:[.!?]+|$)/g)?.map(normalize).filter(Boolean) || [paragraph];
    for (const sentence of sentences) {
      if (sentence.toLocaleLowerCase().includes(target)) contexts.push({ sentence, paragraph });
    }
  }
  return contexts.filter((context, index, all) => all.findIndex((candidate) => candidate.sentence === context.sentence && candidate.paragraph === context.paragraph) === index).slice(0, 20);
}
