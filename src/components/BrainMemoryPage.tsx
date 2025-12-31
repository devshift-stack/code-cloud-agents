/**
 * Brain Memory Page - Knowledge Base Admin UI
 *
 * Admin interface for managing the knowledge base:
 * - Search documents
 * - Ingest new content
 * - View and manage documents
 * - Attach documents to chats
 */

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Search,
  Plus,
  FileText,
  Link,
  File,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";

// API helper
const API_BASE = "/api/brain";

async function brainApi<T>(
  endpoint: string,
  method: string = "GET",
  body?: unknown,
): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }
  return data;
}

// Types
interface BrainDoc {
  id: string;
  userId: string;
  title: string;
  content?: string;
  sourceType: "text" | "url" | "file";
  sourceUrl?: string;
  fileName?: string;
  status: "pending" | "processing" | "ready" | "error";
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SearchResult {
  docId: string;
  chunkId: string;
  content: string;
  similarity: number;
  docTitle: string;
  sourceType: string;
  chunkIndex: number;
}

interface BrainStats {
  totalDocs: number;
  totalChunks: number;
  totalEmbeddings: number;
  embeddingCoverage: number;
  bySourceType: Record<string, number>;
  byStatus: Record<string, number>;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { icon: React.ReactNode; className: string }> =
    {
      ready: {
        icon: <CheckCircle className="h-3 w-3" />,
        className: "bg-green-100 text-green-700",
      },
      processing: {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        className: "bg-blue-100 text-blue-700",
      },
      pending: {
        icon: <Clock className="h-3 w-3" />,
        className: "bg-yellow-100 text-yellow-700",
      },
      error: {
        icon: <AlertCircle className="h-3 w-3" />,
        className: "bg-red-100 text-red-700",
      },
    };

  const variant = variants[status] || variants.pending;

  return (
    <Badge
      className={`flex items-center gap-1 ${variant.className}`}
      data-testid="brain-doc-status"
    >
      {variant.icon}
      {status}
    </Badge>
  );
}

// Source type icon
function SourceIcon({ type }: { type: string }) {
  switch (type) {
    case "url":
      return <Link className="h-4 w-4 text-blue-500" />;
    case "file":
      return <File className="h-4 w-4 text-purple-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
}

// Main component
export function BrainMemoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<
    "hybrid" | "semantic" | "keyword"
  >("hybrid");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [docs, setDocs] = useState<BrainDoc[]>([]);
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIngestOpen, setIsIngestOpen] = useState(false);

  // Ingest form state
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestContent, setIngestContent] = useState("");
  const [ingestType, setIngestType] = useState<"text" | "url">("text");
  const [ingestUrl, setIngestUrl] = useState("");

  // Load data
  const loadDocs = useCallback(async () => {
    try {
      const result = await brainApi<{ docs: BrainDoc[] }>("/docs?limit=50");
      setDocs(result.docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const result = await brainApi<{ stats: BrainStats }>("/stats");
      setStats(result.stats);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  useEffect(() => {
    loadDocs();
    loadStats();
  }, [loadDocs, loadStats]);

  // Search handler
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await brainApi<{ results: SearchResult[] }>(
        "/search",
        "POST",
        {
          query: searchQuery,
          mode: searchMode,
          limit: 20,
        },
      );
      setSearchResults(result.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  // Ingest handler
  const handleIngest = async () => {
    if (!ingestTitle.trim() || !ingestContent.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (ingestType === "url") {
        await brainApi("/ingest/url", "POST", {
          title: ingestTitle,
          url: ingestUrl,
          content: ingestContent,
        });
      } else {
        await brainApi("/ingest/text", "POST", {
          title: ingestTitle,
          content: ingestContent,
        });
      }

      setIsIngestOpen(false);
      setIngestTitle("");
      setIngestContent("");
      setIngestUrl("");
      await loadDocs();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setLoading(false);
    }
  };

  // Delete handler
  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await brainApi(`/docs/${docId}`, "DELETE");
      await loadDocs();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-purple-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="brain-page-title">
              Knowledge Base
            </h1>
            <p className="text-muted-foreground">
              Manage your AI's memory and knowledge
            </p>
          </div>
        </div>

        <Dialog open={isIngestOpen} onOpenChange={setIsIngestOpen}>
          <DialogTrigger asChild>
            <Button data-testid="brain-ingest-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Knowledge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Knowledge</DialogTitle>
              <DialogDescription>
                Add text content or URL to your knowledge base
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={ingestType}
                  onValueChange={(v) => setIngestType(v as "text" | "url")}
                >
                  <SelectTrigger data-testid="brain-ingest-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Plain Text</SelectItem>
                    <SelectItem value="url">URL Content</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Document title..."
                  value={ingestTitle}
                  onChange={(e) => setIngestTitle(e.target.value)}
                  data-testid="brain-ingest-title"
                />
              </div>

              {ingestType === "url" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL</label>
                  <Input
                    placeholder="https://..."
                    value={ingestUrl}
                    onChange={(e) => setIngestUrl(e.target.value)}
                    data-testid="brain-ingest-url"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Paste your content here..."
                  value={ingestContent}
                  onChange={(e) => setIngestContent(e.target.value)}
                  rows={8}
                  data-testid="brain-ingest-content"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsIngestOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleIngest} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add to Knowledge Base
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" data-testid="brain-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalDocs}</div>
              <div className="text-sm text-muted-foreground">Documents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalChunks}</div>
              <div className="text-sm text-muted-foreground">Chunks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalEmbeddings}</div>
              <div className="text-sm text-muted-foreground">Embeddings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {stats.embeddingCoverage}%
              </div>
              <div className="text-sm text-muted-foreground">Coverage</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Search
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Semantic Search</CardTitle>
              <CardDescription>
                Search your knowledge base using natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question or search for keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                  data-testid="brain-search-input"
                />
                <Select
                  value={searchMode}
                  onValueChange={(v) => setSearchMode(v as typeof searchMode)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="semantic">Semantic</SelectItem>
                    <SelectItem value="keyword">Keyword</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Search Results */}
              <div className="space-y-3" data-testid="brain-search-results">
                {searchResults.length === 0 && !loading && searchQuery && (
                  <p className="text-muted-foreground text-center py-4">
                    No results found
                  </p>
                )}

                {searchResults.map((result, index) => (
                  <Card key={`${result.chunkId}-${index}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SourceIcon type={result.sourceType} />
                          <span className="font-medium">{result.docTitle}</span>
                          <Badge variant="outline">
                            Chunk {result.chunkIndex + 1}
                          </Badge>
                        </div>
                        {result.similarity !== undefined && (
                          <Badge variant="secondary">
                            {(result.similarity * 100).toFixed(1)}% match
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {result.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={loadDocs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="space-y-3">
            {docs.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No documents yet. Add your first knowledge!
                </CardContent>
              </Card>
            )}

            {docs.map((doc) => (
              <Card key={doc.id} data-testid={`brain-doc-${doc.id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <SourceIcon type={doc.sourceType} />
                      <div>
                        <h3 className="font-medium">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {doc.chunkCount} chunks • Created{" "}
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={doc.status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id)}
                        data-testid={`brain-doc-delete-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BrainMemoryPage;
