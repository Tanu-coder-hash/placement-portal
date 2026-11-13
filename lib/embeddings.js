// Embedding generation for the vector store.
//
//   provider "local"  -> all-MiniLM-L6-v2 via transformers.js (runs inside Node, no API key)
//   provider "openai" -> text-embedding-3-small with dimensions = EMBEDDING_DIM
//
// Long documents (resumes, job descriptions) are split into overlapping
// word chunks, each chunk is embedded, and the chunk vectors are combined
// with a weighted mean and L2-normalised. This keeps every chunk inside the
// model's 256-token window while still representing the whole document.

export const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 384);

function provider() {
  return (process.env.EMBEDDING_PROVIDER || 'local').toLowerCase();
}

function localModelId() {
  return process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
}

function openAiModelId() {
  return process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
}

/** Model identifier stored next to every vector. */
export function embeddingModelName() {
  return provider() === 'openai' ? `openai/${openAiModelId()}` : localModelId();
}

// ---------------------------------------------------------------- local model
async function getLocalExtractor() {
  if (!globalThis.__placementPortalExtractor) {
    globalThis.__placementPortalExtractor = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      if (process.env.TRANSFORMERS_CACHE_DIR) env.cacheDir = process.env.TRANSFORMERS_CACHE_DIR;
      return pipeline('feature-extraction', localModelId(), { dtype: 'fp32' });
    })().catch((err) => {
      globalThis.__placementPortalExtractor = undefined;
      throw err;
    });
  }
  return globalThis.__placementPortalExtractor;
}

async function embedLocal(texts) {
  const extractor = await getLocalExtractor();
  const vectors = [];
  const BATCH = 16;
  for (let i = 0; i < texts.length; i += BATCH) {
    const output = await extractor(texts.slice(i, i + BATCH), { pooling: 'mean', normalize: true });
    vectors.push(...output.tolist());
  }
  return vectors;
}

// ---------------------------------------------------------------- OpenAI
async function embedOpenAI(texts) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is not set.');
  const vectors = [];
  const BATCH = 96;
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: openAiModelId(), input: texts.slice(i, i + BATCH), dimensions: EMBEDDING_DIM }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI embeddings request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    const json = await res.json();
    vectors.push(...json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
  }
  return vectors;
}

// ---------------------------------------------------------------- helpers
export function l2normalize(vector) {
  let norm = 0;
  for (const x of vector) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return vector.map((x) => x / norm);
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/** Splits text into overlapping chunks of ~maxWords words. */
export function chunkText(text, maxWords = 160, overlap = 30) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= maxWords) return [words.join(' ')];
  const chunks = [];
  const step = Math.max(1, maxWords - overlap);
  for (let start = 0; start < words.length; start += step) {
    chunks.push(words.slice(start, start + maxWords).join(' '));
    if (start + maxWords >= words.length) break;
  }
  return chunks;
}

/** Embeds a list of strings; returns L2-normalised vectors of length EMBEDDING_DIM. */
export async function embedTexts(texts) {
  const clean = texts.map((t) => String(t || '').trim()).filter(Boolean);
  if (clean.length === 0) return [];
  const raw = provider() === 'openai' ? await embedOpenAI(clean) : await embedLocal(clean);
  return raw.map((v) => {
    if (v.length !== EMBEDDING_DIM) {
      throw new Error(
        `Embedding has ${v.length} dimensions but the database expects ${EMBEDDING_DIM}. ` +
          'Use a 384-dimension model or change vector(384) in db/01_schema.sql.',
      );
    }
    return l2normalize(v);
  });
}

/**
 * Embeds a multi-part document.
 * segments: [{ text, weight }] — e.g. skills (weight 2), projects (1.5), resume body (1)
 * Returns { vector, chunkCount, sourceChars } or null when there is no text.
 */
export async function embedDocument(segments) {
  const pieces = [];
  let sourceChars = 0;
  for (const segment of segments) {
    const text = String(segment?.text || '').trim();
    if (!text) continue;
    sourceChars += text.length;
    for (const chunk of chunkText(text)) pieces.push({ text: chunk, weight: segment.weight ?? 1 });
  }
  if (pieces.length === 0) return null;

  const vectors = await embedTexts(pieces.map((p) => p.text));
  const sum = new Array(EMBEDDING_DIM).fill(0);
  vectors.forEach((vec, i) => {
    const w = pieces[i].weight;
    for (let d = 0; d < EMBEDDING_DIM; d += 1) sum[d] += vec[d] * w;
  });
  return { vector: l2normalize(sum), chunkCount: pieces.length, sourceChars };
}

/** Embeds a short free-text search query. */
export async function embedQuery(text) {
  const [vector] = await embedTexts([text]);
  if (!vector) throw new Error('Search query is empty.');
  return vector;
}

/** pgvector text format: '[0.1,0.2,...]' — pass as a parameter and cast with ::vector */
export function toSqlVector(vector) {
  return `[${vector.map((x) => Number(x).toFixed(7)).join(',')}]`;
}
