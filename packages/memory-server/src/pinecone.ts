import { Pinecone } from '@pinecone-database/pinecone';
import { Memory, RecallQuery, RecallResult, SecurityLevel, SHADOW_HASH } from './types.js';
import { createEmbedding } from './embeddings.js';
import { createHash } from 'crypto';

// Security-Level Hierarchie (höher = mehr Zugriff)
const SECURITY_HIERARCHY: Record<string, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  secret: 3,
  shadow: 99,  // Existiert nicht offiziell
};

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function canAccessLevel(
  requestedLevel: string,
  maxLevel: SecurityLevel = 'public',
  accessKey?: string,
  shadowKey?: string
): boolean {
  // Shadow-Level: nur mit korrektem Shadow-Key
  if (requestedLevel === 'shadow') {
    return shadowKey !== undefined && hashKey(shadowKey) === SHADOW_HASH;
  }

  // Secret-Level: braucht Access-Key
  if (requestedLevel === 'secret' && !accessKey) {
    return false;
  }

  return SECURITY_HIERARCHY[requestedLevel] <= SECURITY_HIERARCHY[maxLevel];
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const INDEX_NAME = 'assistant-memory';

export async function initIndex() {
  const indexes = await pinecone.listIndexes();
  const indexExists = indexes.indexes?.some(i => i.name === INDEX_NAME);

  if (!indexExists) {
    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: 1536, // text-embedding-3-small dimension
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });
    console.log(`Created index: ${INDEX_NAME}`);
  }

  return pinecone.index(INDEX_NAME);
}

export async function remember(memory: Memory): Promise<void> {
  const index = await initIndex();
  const embedding = await createEmbedding(memory.content);

  await index.upsert([
    {
      id: memory.id,
      values: embedding,
      metadata: {
        type: memory.type,
        content: memory.content,
        project: memory.metadata.project || 'global',
        tags: memory.metadata.tags?.join(',') || '',
        importance: memory.metadata.importance || 'medium',
        timestamp: memory.metadata.timestamp,
        expiresAt: memory.metadata.expiresAt || '',
        security: memory.metadata.security || 'internal',
        accessKey: memory.metadata.accessKey || '',
      },
    },
  ]);
}

export async function recall(query: RecallQuery): Promise<RecallResult[]> {
  const index = await initIndex();
  const embedding = await createEmbedding(query.query);

  const filter: Record<string, any> = {};
  if (query.type) filter.type = { $eq: query.type };
  if (query.project) filter.project = { $eq: query.project };

  // WICHTIG: Shadow-Level wird NIEMALS in normalen Abfragen angezeigt
  // Es sei denn, der korrekte shadowKey wird mitgegeben
  if (!query.shadowKey || hashKey(query.shadowKey) !== SHADOW_HASH) {
    filter.security = { $ne: 'shadow' };
  }

  const results = await index.query({
    vector: embedding,
    topK: query.limit || 10,
    includeMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  // Filtere Ergebnisse basierend auf Security-Level
  const filteredResults = results.matches.filter(match => {
    const level = match.metadata?.security as string || 'public';
    return canAccessLevel(level, query.securityLevel, query.accessKey, query.shadowKey);
  });

  return filteredResults.map(match => ({
    memory: {
      id: match.id,
      type: match.metadata?.type as Memory['type'],
      content: match.metadata?.content as string,
      metadata: {
        project: match.metadata?.project as string,
        tags: (match.metadata?.tags as string)?.split(',').filter(Boolean),
        importance: match.metadata?.importance as Memory['metadata']['importance'],
        timestamp: match.metadata?.timestamp as string,
        expiresAt: match.metadata?.expiresAt as string,
        security: match.metadata?.security as Memory['metadata']['security'],
      },
    },
    score: match.score || 0,
  }));
}

export async function forget(id: string): Promise<void> {
  const index = await initIndex();
  await index.deleteOne(id);
}

export async function forgetAll(project?: string): Promise<void> {
  const index = await initIndex();
  if (project) {
    await index.deleteMany({ project: { $eq: project } });
  } else {
    await index.deleteAll();
  }
}
