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

function getAccessLevel(query: RecallQuery): number {
  // Shadow-Level Prüfung (undokumentiert)
  if (query.shadowKey && SHADOW_HASH && hashKey(query.shadowKey) === SHADOW_HASH) {
    return SECURITY_HIERARCHY.shadow;
  }

  // Secret-Level braucht accessKey
  if (query.securityLevel === 'secret' && query.accessKey) {
    return SECURITY_HIERARCHY.secret;
  }

  return SECURITY_HIERARCHY[query.securityLevel || 'internal'] || 1;
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
      dimension: 1536,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });
  }
}

export async function remember(memory: Memory): Promise<void> {
  const index = pinecone.index(INDEX_NAME);
  const embedding = await createEmbedding(memory.content);

  await index.upsert([
    {
      id: memory.id,
      values: embedding,
      metadata: {
        type: memory.type,
        content: memory.content,
        project: memory.metadata.project || '',
        tags: memory.metadata.tags?.join(',') || '',
        importance: memory.metadata.importance || 'medium',
        timestamp: memory.metadata.timestamp,
        expiresAt: memory.metadata.expiresAt || '',
        security: memory.metadata.security || 'internal',
      },
    },
  ]);
}

export async function recall(query: RecallQuery): Promise<RecallResult[]> {
  const index = pinecone.index(INDEX_NAME);
  const embedding = await createEmbedding(query.query);
  const accessLevel = getAccessLevel(query);

  const filter: Record<string, any> = {};
  if (query.type) filter.type = { $eq: query.type };
  if (query.project) filter.project = { $eq: query.project };

  const results = await index.query({
    vector: embedding,
    topK: query.limit || 10,
    includeMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  return results.matches
    .filter(match => {
      const memorySecurity = (match.metadata?.security as string) || 'internal';
      const memoryLevel = SECURITY_HIERARCHY[memorySecurity] || 1;
      return memoryLevel <= accessLevel;
    })
    .map(match => ({
      memory: {
        id: match.id,
        type: match.metadata?.type as Memory['type'],
        content: match.metadata?.content as string,
        metadata: {
          project: match.metadata?.project as string,
          tags: (match.metadata?.tags as string)?.split(',').filter(Boolean),
          importance: match.metadata?.importance as Memory['metadata']['importance'],
          timestamp: match.metadata?.timestamp as string,
          security: match.metadata?.security as SecurityLevel,
        },
      },
      score: match.score || 0,
    }));
}

export async function forget(id: string): Promise<void> {
  const index = pinecone.index(INDEX_NAME);
  await index.deleteOne(id);
}

export async function forgetAll(project?: string): Promise<void> {
  const index = pinecone.index(INDEX_NAME);
  if (project) {
    await index.deleteMany({ project: { $eq: project } });
  } else {
    await index.deleteAll();
  }
}

export async function getContext(project: string, accessLevel: number = 1): Promise<RecallResult[]> {
  return recall({
    query: 'recent context decisions preferences todos',
    project,
    limit: 20,
    securityLevel: accessLevel >= 3 ? 'secret' : accessLevel >= 2 ? 'confidential' : 'internal',
  });
}
