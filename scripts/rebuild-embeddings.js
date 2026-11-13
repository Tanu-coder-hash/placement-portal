// Re-embeds every student, project and job.
//   npm run embeddings:rebuild
// Run this after changing EMBEDDING_PROVIDER / EMBEDDING_MODEL.
import 'dotenv/config';
import { closePool } from '../lib/db.js';
import { embeddingModelName } from '../lib/embeddings.js';
import { rebuildAllEmbeddings } from '../lib/services/indexing.js';

async function main() {
  console.log(`Embedding model: ${embeddingModelName()} (first run downloads the model, ~25 MB)`);
  const started = Date.now();
  try {
    const counts = await rebuildAllEmbeddings((msg) => process.stdout.write(`\r  indexed ${msg}          `));
    console.log(
      `\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s: ${counts.students} students, ${counts.projects} projects, ${counts.jobs} jobs.`,
    );
  } catch (err) {
    console.error('\nFAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

main();
