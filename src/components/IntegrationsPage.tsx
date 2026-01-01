/**
 * Integrations Page
 * GitHub, Linear, Webhooks management
 */

import { useState, useEffect } from "react";
import {
  githubApi,
  linearApi,
  webhooksApi,
  type GithubRepo,
  type GithubIssue,
  type LinearTeam,
  type LinearIssue,
  type Webhook,
} from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Github,
  Webhook as WebhookIcon,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Send,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

// Linear icon component
function LinearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 12a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0ZM12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" />
    </svg>
  );
}

export function IntegrationsPage() {
  // GitHub state
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [githubIssues, setGithubIssues] = useState<GithubIssue[]>([]);

  // Linear state
  const [linearConnected, setLinearConnected] = useState(false);
  const [linearTeams, setLinearTeams] = useState<LinearTeam[]>([]);
  const [linearIssues, setLinearIssues] = useState<LinearIssue[]>([]);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [createWebhookOpen, setCreateWebhookOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [issueType, setIssueType] = useState<"github" | "linear">("github");

  // Form state
  const [webhookForm, setWebhookForm] = useState({
    url: "",
    events: [] as string[],
    secret: "",
  });
  const [issueForm, setIssueForm] = useState({
    title: "",
    body: "",
    repo: "",
    teamId: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load GitHub data
      const ghStatus = await githubApi
        .status()
        .catch(() => ({ connected: false }));
      setGithubConnected(ghStatus.connected);
      if (ghStatus.connected) {
        const [reposRes, issuesRes] = await Promise.all([
          githubApi.repos().catch(() => ({ repos: [] })),
          githubApi.issues().catch(() => ({ issues: [] })),
        ]);
        setGithubRepos(reposRes.repos);
        setGithubIssues(issuesRes.issues);
      }

      // Load Linear data
      const linearStatus = await linearApi
        .status()
        .catch(() => ({ connected: false }));
      setLinearConnected(linearStatus.connected);
      if (linearStatus.connected) {
        const [teamsRes, issuesRes] = await Promise.all([
          linearApi.teams().catch(() => ({ teams: [] })),
          linearApi.issues().catch(() => ({ issues: [] })),
        ]);
        setLinearTeams(teamsRes.teams);
        setLinearIssues(issuesRes.issues);
      }

      // Load webhooks
      const webhooksRes = await webhooksApi
        .list()
        .catch(() => ({ webhooks: [] }));
      setWebhooks(webhooksRes.webhooks);
    } catch (error) {
      console.error("Failed to load integrations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWebhook() {
    try {
      await webhooksApi.create({
        url: webhookForm.url,
        events: webhookForm.events,
        secret: webhookForm.secret || undefined,
      });
      toast.success("Webhook erstellt");
      setCreateWebhookOpen(false);
      setWebhookForm({ url: "", events: [], secret: "" });
      loadData();
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  async function handleDeleteWebhook(id: string) {
    try {
      await webhooksApi.delete(id);
      toast.success("Webhook gelöscht");
      loadData();
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  async function handleTestWebhook(id: string) {
    try {
      await webhooksApi.test(id);
      toast.success("Test-Webhook gesendet");
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  async function handleCreateIssue() {
    try {
      if (issueType === "github") {
        await githubApi.createIssue({
          title: issueForm.title,
          body: issueForm.body,
          repo: issueForm.repo,
        });
      } else {
        await linearApi.createIssue({
          title: issueForm.title,
          description: issueForm.body,
          teamId: issueForm.teamId,
        });
      }
      toast.success("Issue erstellt");
      setCreateIssueOpen(false);
      setIssueForm({ title: "", body: "", repo: "", teamId: "" });
      loadData();
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  const availableEvents = [
    "task.created",
    "task.completed",
    "task.failed",
    "agent.started",
    "agent.stopped",
    "user.login",
    "deploy.success",
    "deploy.failed",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="w-6 h-6" />
            Integrationen
          </h1>
          <p className="text-muted-foreground">
            GitHub, Linear und Webhook-Verbindungen verwalten
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Aktualisieren
        </Button>
      </div>

      <Tabs defaultValue="github" className="space-y-4">
        <TabsList>
          <TabsTrigger value="github" data-testid="integrations_tab_github">
            <Github className="w-4 h-4 mr-2" />
            GitHub
          </TabsTrigger>
          <TabsTrigger value="linear" data-testid="integrations_tab_linear">
            <LinearIcon className="w-4 h-4 mr-2" />
            Linear
          </TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="integrations_tab_webhooks">
            <WebhookIcon className="w-4 h-4 mr-2" />
            Webhooks ({webhooks.length})
          </TabsTrigger>
        </TabsList>

        {/* GitHub Tab */}
        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="w-5 h-5" />
                    GitHub Integration
                  </CardTitle>
                  <CardDescription>
                    Repositories und Issues verwalten
                  </CardDescription>
                </div>
                <Badge variant={githubConnected ? "default" : "secondary"}>
                  {githubConnected ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" /> Verbunden
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" /> Nicht verbunden
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!githubConnected ? (
                <div className="text-center py-8">
                  <Github className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    GitHub ist nicht verbunden. Konfigurieren Sie GITHUB_TOKEN
                    in den Umgebungsvariablen.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Repos */}
                  <div>
                    <h3 className="font-semibold mb-3">
                      Repositories ({githubRepos.length})
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {githubRepos.slice(0, 6).map((repo) => (
                        <Card key={repo.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{repo.name}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {repo.description || "Keine Beschreibung"}
                              </p>
                            </div>
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Issues */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">
                        Offene Issues ({githubIssues.length})
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => {
                          setIssueType("github");
                          setCreateIssueOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Neues Issue
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Titel</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Erstellt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {githubIssues.slice(0, 5).map((issue) => (
                          <TableRow key={issue.id}>
                            <TableCell className="font-mono">
                              #{issue.number}
                            </TableCell>
                            <TableCell>{issue.title}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  issue.state === "open"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {issue.state}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(issue.createdAt).toLocaleDateString(
                                "de-DE",
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linear Tab */}
        <TabsContent value="linear" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LinearIcon className="w-5 h-5" />
                    Linear Integration
                  </CardTitle>
                  <CardDescription>Teams und Issues verwalten</CardDescription>
                </div>
                <Badge variant={linearConnected ? "default" : "secondary"}>
                  {linearConnected ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" /> Verbunden
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" /> Nicht verbunden
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!linearConnected ? (
                <div className="text-center py-8">
                  <LinearIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Linear ist nicht verbunden. Konfigurieren Sie LINEAR_API_KEY
                    in den Umgebungsvariablen.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Teams */}
                  <div>
                    <h3 className="font-semibold mb-3">
                      Teams ({linearTeams.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {linearTeams.map((team) => (
                        <Badge key={team.id} variant="outline">
                          {team.name} ({team.key})
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Issues */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">
                        Issues ({linearIssues.length})
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => {
                          setIssueType("linear");
                          setCreateIssueOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Neues Issue
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Titel</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priorität</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {linearIssues.slice(0, 5).map((issue) => (
                          <TableRow key={issue.id}>
                            <TableCell>{issue.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{issue.state}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  issue.priority <= 1
                                    ? "destructive"
                                    : issue.priority <= 2
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                P{issue.priority}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <WebhookIcon className="w-5 h-5" />
                    Webhooks
                  </CardTitle>
                  <CardDescription>
                    Externe Dienste bei Events benachrichtigen
                  </CardDescription>
                </div>
                <Button onClick={() => setCreateWebhookOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Neuer Webhook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8">
                  <WebhookIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Keine Webhooks konfiguriert
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setCreateWebhookOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ersten Webhook erstellen
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead className="w-[120px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-mono text-sm max-w-[300px] truncate">
                          {webhook.url}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.slice(0, 2).map((event) => (
                              <Badge
                                key={event}
                                variant="outline"
                                className="text-xs"
                              >
                                {event}
                              </Badge>
                            ))}
                            {webhook.events.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{webhook.events.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch checked={webhook.active} disabled />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(webhook.createdAt).toLocaleDateString(
                            "de-DE",
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleTestWebhook(webhook.id)}
                              title="Test senden"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteWebhook(webhook.id)}
                              title="Löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Webhook Dialog */}
      <Dialog open={createWebhookOpen} onOpenChange={setCreateWebhookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Webhook erstellen</DialogTitle>
            <DialogDescription>
              Konfigurieren Sie einen Webhook um bei Events benachrichtigt zu
              werden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL *</Label>
              <Input
                id="webhook-url"
                type="url"
                value={webhookForm.url}
                onChange={(e) =>
                  setWebhookForm({ ...webhookForm, url: e.target.value })
                }
                placeholder="https://example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Events *</Label>
              <div className="flex flex-wrap gap-2">
                {availableEvents.map((event) => (
                  <Badge
                    key={event}
                    variant={
                      webhookForm.events.includes(event) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => {
                      const events = webhookForm.events.includes(event)
                        ? webhookForm.events.filter((e) => e !== event)
                        : [...webhookForm.events, event];
                      setWebhookForm({ ...webhookForm, events });
                    }}
                  >
                    {event}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Secret (optional)</Label>
              <Input
                id="webhook-secret"
                type="password"
                value={webhookForm.secret}
                onChange={(e) =>
                  setWebhookForm({ ...webhookForm, secret: e.target.value })
                }
                placeholder="Webhook-Signatur-Secret"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateWebhookOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateWebhook}
              disabled={!webhookForm.url || webhookForm.events.length === 0}
            >
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Issue Dialog */}
      <Dialog open={createIssueOpen} onOpenChange={setCreateIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {issueType === "github"
                ? "GitHub Issue erstellen"
                : "Linear Issue erstellen"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="issue-title">Titel *</Label>
              <Input
                id="issue-title"
                value={issueForm.title}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, title: e.target.value })
                }
                placeholder="Issue Titel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue-body">Beschreibung</Label>
              <Textarea
                id="issue-body"
                value={issueForm.body}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, body: e.target.value })
                }
                placeholder="Issue Beschreibung..."
                rows={4}
              />
            </div>
            {issueType === "github" && githubRepos.length > 0 && (
              <div className="space-y-2">
                <Label>Repository *</Label>
                <div className="flex flex-wrap gap-2">
                  {githubRepos.slice(0, 6).map((repo) => (
                    <Badge
                      key={repo.id}
                      variant={
                        issueForm.repo === repo.fullName ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setIssueForm({ ...issueForm, repo: repo.fullName })
                      }
                    >
                      {repo.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {issueType === "linear" && linearTeams.length > 0 && (
              <div className="space-y-2">
                <Label>Team *</Label>
                <div className="flex flex-wrap gap-2">
                  {linearTeams.map((team) => (
                    <Badge
                      key={team.id}
                      variant={
                        issueForm.teamId === team.id ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setIssueForm({ ...issueForm, teamId: team.id })
                      }
                    >
                      {team.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateIssueOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateIssue}
              disabled={
                !issueForm.title ||
                (issueType === "github" && !issueForm.repo) ||
                (issueType === "linear" && !issueForm.teamId)
              }
            >
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
