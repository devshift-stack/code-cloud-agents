#!/usr/bin/env npx tsx

/**
 * Brain CLI - Knowledge Base Command Line Tool
 *
 * Usage:
 *   npx tsx scripts/brain-cli.ts search "your query"
 *   npx tsx scripts/brain-cli.ts ingest --title "Title" --content "Content"
 *   npx tsx scripts/brain-cli.ts list
 *   npx tsx scripts/brain-cli.ts stats
 */

const API_URL = process.env.BRAIN_API_URL || "http://localhost:3000/api/brain";
const TOKEN = process.env.BRAIN_AUTH_TOKEN || process.env.AUTH_TOKEN || "";

interface BrainDoc {
  id: string;
  title: string;
  sourceType: string;
  status: string;
  chunkCount: number;
  createdAt: string;
}

interface SearchResult {
  docId: string;
  docTitle: string;
  content: string;
  similarity?: number;
}

async function request(
  endpoint: string,
  method: string = "GET",
  body?: Record<string, unknown>
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (TOKEN) {
    headers["Authorization"] = `Bearer ${TOKEN}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

async function search(query: string, mode: string = "hybrid", limit: number = 10): Promise<void> {
  console.log(`🔍 Searching: "${query}" (mode: ${mode})...\n`);

  const result = (await request("/search", "POST", { query, mode, limit })) as {
    results: SearchResult[];
    count: number;
  };

  if (result.count === 0) {
    console.log("No results found.");
    return;
  }

  console.log(`Found ${result.count} results:\n`);

  for (const item of result.results) {
    console.log(`📄 ${item.docTitle}`);
    console.log(`   Similarity: ${item.similarity?.toFixed(3) || "N/A"}`);
    console.log(`   ${item.content.slice(0, 200)}...`);
    console.log();
  }
}

async function ingest(title: string, content: string, metadata?: Record<string, unknown>): Promise<void> {
  console.log(`📥 Ingesting: "${title}"...\n`);

  const result = (await request("/ingest/text", "POST", { title, content, metadata })) as {
    doc: BrainDoc;
  };

  console.log(`✅ Document created:`);
  console.log(`   ID: ${result.doc.id}`);
  console.log(`   Title: ${result.doc.title}`);
  console.log(`   Chunks: ${result.doc.chunkCount}`);
  console.log(`   Status: ${result.doc.status}`);
}

async function list(limit: number = 20, sourceType?: string): Promise<void> {
  let query = `?limit=${limit}`;
  if (sourceType) query += `&sourceType=${sourceType}`;

  const result = (await request(`/docs${query}`)) as {
    docs: BrainDoc[];
    count: number;
  };

  console.log(`📚 Documents (${result.count}):\n`);

  for (const doc of result.docs) {
    console.log(`  ${doc.id.slice(0, 8)}  ${doc.sourceType.padEnd(5)}  ${doc.title}`);
  }
}

async function stats(): Promise<void> {
  const result = (await request("/stats")) as {
    enabled: boolean;
    stats: {
      totalDocs: number;
      totalChunks: number;
      totalEmbeddings: number;
      embeddingCoverage: number;
    };
  };

  console.log(`📊 Brain Statistics:\n`);
  console.log(`   Semantic Search: ${result.enabled ? "✅ Enabled" : "❌ Disabled"}`);
  console.log(`   Documents: ${result.stats.totalDocs}`);
  console.log(`   Chunks: ${result.stats.totalChunks}`);
  console.log(`   Embeddings: ${result.stats.totalEmbeddings}`);
  console.log(`   Coverage: ${result.stats.embeddingCoverage}%`);
}

async function deleteDoc(docId: string): Promise<void> {
  console.log(`🗑️ Deleting: ${docId}...\n`);

  await request(`/docs/${docId}`, "DELETE");

  console.log(`✅ Document deleted.`);
}

// CLI Parsing
const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  if (!command) {
    console.log(`
Brain CLI - Knowledge Base Tool

Usage:
  brain-cli search <query> [--mode hybrid|semantic|keyword] [--limit N]
  brain-cli ingest --title "Title" --content "Content"
  brain-cli list [--limit N] [--type text|url|file]
  brain-cli stats
  brain-cli delete <doc_id>

Environment:
  BRAIN_API_URL   API base URL (default: http://localhost:3000/api/brain)
  AUTH_TOKEN      Authentication token
`);
    process.exit(0);
  }

  try {
    switch (command) {
      case "search": {
        const query = args[1];
        if (!query) {
          console.error("Error: Query required");
          process.exit(1);
        }
        const modeIdx = args.indexOf("--mode");
        const mode = modeIdx > -1 ? args[modeIdx + 1] : "hybrid";
        const limitIdx = args.indexOf("--limit");
        const limit = limitIdx > -1 ? parseInt(args[limitIdx + 1]) : 10;
        await search(query, mode, limit);
        break;
      }

      case "ingest": {
        const titleIdx = args.indexOf("--title");
        const contentIdx = args.indexOf("--content");
        if (titleIdx === -1 || contentIdx === -1) {
          console.error("Error: --title and --content required");
          process.exit(1);
        }
        const title = args[titleIdx + 1];
        const content = args[contentIdx + 1];
        await ingest(title, content);
        break;
      }

      case "list": {
        const limitIdx = args.indexOf("--limit");
        const limit = limitIdx > -1 ? parseInt(args[limitIdx + 1]) : 20;
        const typeIdx = args.indexOf("--type");
        const sourceType = typeIdx > -1 ? args[typeIdx + 1] : undefined;
        await list(limit, sourceType);
        break;
      }

      case "stats":
        await stats();
        break;

      case "delete": {
        const docId = args[1];
        if (!docId) {
          console.error("Error: Document ID required");
          process.exit(1);
        }
        await deleteDoc(docId);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main();
