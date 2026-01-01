/**
 * Audit & Ops Dashboard
 * System events, audit logs, and operational stats
 */

import { useState, useEffect } from "react";
import {
  auditApi,
  opsApi,
  enforcementApi,
  type AuditEvent,
  type BlockedTask,
} from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Shield,
  Zap,
  Server,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [blockedTasks, setBlockedTasks] = useState<BlockedTask[]>([]);
  const [opsStats, setOpsStats] = useState<{
    uptime: number;
    activeAgents: number;
    tasksToday: number;
    errorsToday: number;
  } | null>(null);
  const [eventStats, setEventStats] = useState<{
    total: number;
    byKind: Record<string, number>;
    bySeverity: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [limit, setLimit] = useState(50);

  // Dialog states
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [selectedTask, setSelectedTask] = useState<BlockedTask | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [kindFilter, severityFilter, limit]);

  async function loadData() {
    setLoading(true);
    try {
      const params: { limit?: number; kind?: string; severity?: string } = {
        limit,
      };
      if (kindFilter !== "all") params.kind = kindFilter;
      if (severityFilter !== "all") params.severity = severityFilter;

      const [eventsRes, statsRes, opsRes, blockedRes] = await Promise.all([
        auditApi.list(params),
        auditApi.eventStats().catch(() => null),
        opsApi.stats().catch(() => null),
        enforcementApi.blocked().catch(() => ({ tasks: [] })),
      ]);

      setEvents(eventsRes.events || []);
      setEventStats(statsRes?.stats || null);
      setOpsStats(opsRes);
      setBlockedTasks(blockedRes.tasks || []);
    } catch (error) {
      console.error("Failed to load audit data:", error);
      toast.error("Fehler beim Laden der Audit-Daten");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedTask) return;
    try {
      await enforcementApi.approve(selectedTask.taskId, "Approved by admin");
      toast.success("Task genehmigt");
      setApproveDialogOpen(false);
      setSelectedTask(null);
      loadData();
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  async function handleReject() {
    if (!selectedTask) return;
    try {
      await enforcementApi.reject(selectedTask.taskId, "Rejected by admin");
      toast.success("Task abgelehnt");
      setApproveDialogOpen(false);
      setSelectedTask(null);
      loadData();
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  // Filter events by search
  const filteredEvents = events.filter(
    (event) =>
      event.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.kind.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Severity badge
  function getSeverityBadge(severity: string) {
    switch (severity) {
      case "error":
        return <Badge variant="destructive">{severity}</Badge>;
      case "warn":
        return <Badge className="bg-yellow-500">{severity}</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  }

  // Kind badge
  function getKindBadge(kind: string) {
    const colors: Record<string, string> = {
      user_login: "bg-green-500",
      user_logout: "bg-gray-500",
      password_reset: "bg-orange-500",
      task_created: "bg-blue-500",
      task_finished: "bg-green-600",
      task_failed: "bg-red-500",
      error: "bg-red-600",
      deploy: "bg-purple-500",
    };
    return (
      <Badge className={colors[kind] || "bg-gray-400"} variant="secondary">
        {kind.replace(/_/g, " ")}
      </Badge>
    );
  }

  // Format uptime
  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Audit & Operations
          </h1>
          <p className="text-muted-foreground">
            System-Events, Audit-Logs und Operations-Statistiken
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Aktualisieren
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Server className="w-4 h-4" /> Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {opsStats ? formatUptime(opsStats.uptime) : "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Zap className="w-4 h-4" /> Tasks Heute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {opsStats?.tasksToday ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Fehler Heute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {opsStats?.errorsToday ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Shield className="w-4 h-4" /> Blockiert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {blockedTasks.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" data-testid="audit_tab_events">
            <Activity className="w-4 h-4 mr-2" />
            Events ({events.length})
          </TabsTrigger>
          <TabsTrigger value="blocked" data-testid="audit_tab_blocked">
            <Shield className="w-4 h-4 mr-2" />
            Blockiert ({blockedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="audit_tab_stats">
            <FileText className="w-4 h-4 mr-2" />
            Statistiken
          </TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Events durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="audit_input_search"
              />
            </div>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Art" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Arten</SelectItem>
                <SelectItem value="user_login">Login</SelectItem>
                <SelectItem value="user_logout">Logout</SelectItem>
                <SelectItem value="password_reset">Passwort Reset</SelectItem>
                <SelectItem value="task_created">Task erstellt</SelectItem>
                <SelectItem value="task_finished">Task beendet</SelectItem>
                <SelectItem value="task_failed">Task fehlgeschlagen</SelectItem>
                <SelectItem value="error">Fehler</SelectItem>
                <SelectItem value="deploy">Deploy</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warnung</SelectItem>
                <SelectItem value="error">Fehler</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={limit.toString()}
              onValueChange={(v) => setLimit(Number(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Events Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Zeit</TableHead>
                    <TableHead className="w-[150px]">Art</TableHead>
                    <TableHead className="w-[100px]">Severity</TableHead>
                    <TableHead>Nachricht</TableHead>
                    <TableHead className="w-[150px]">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Laden...
                      </TableCell>
                    </TableRow>
                  ) : filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Keine Events gefunden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => (
                      <TableRow
                        key={event.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedEvent(event)}
                        data-testid={`audit_row_${event.id}`}
                      >
                        <TableCell className="font-mono text-sm">
                          {new Date(event.ts).toLocaleString("de-DE")}
                        </TableCell>
                        <TableCell>{getKindBadge(event.kind)}</TableCell>
                        <TableCell>
                          {getSeverityBadge(event.severity)}
                        </TableCell>
                        <TableCell className="max-w-[400px] truncate">
                          {event.message}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.userId || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked Tasks Tab */}
        <TabsContent value="blocked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blockierte Tasks</CardTitle>
              <CardDescription>
                Tasks die auf Genehmigung warten aufgrund hoher STOP-Scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {blockedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>Keine blockierten Tasks</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task ID</TableHead>
                      <TableHead>Grund</TableHead>
                      <TableHead>STOP Score</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono">
                          {task.taskId.slice(0, 8)}...
                        </TableCell>
                        <TableCell>{task.reason}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.stopScore >= 70 ? "destructive" : "secondary"
                            }
                          >
                            {task.stopScore}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(task.createdAt).toLocaleString("de-DE")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTask(task);
                                setApproveDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Genehmigen
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedTask(task);
                                handleReject();
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Ablehnen
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

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Events nach Art</CardTitle>
              </CardHeader>
              <CardContent>
                {eventStats?.byKind ? (
                  <div className="space-y-2">
                    {Object.entries(eventStats.byKind).map(([kind, count]) => (
                      <div
                        key={kind}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm">
                          {kind.replace(/_/g, " ")}
                        </span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Keine Daten</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Events nach Severity</CardTitle>
              </CardHeader>
              <CardContent>
                {eventStats?.bySeverity ? (
                  <div className="space-y-2">
                    {Object.entries(eventStats.bySeverity).map(
                      ([severity, count]) => (
                        <div
                          key={severity}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm capitalize">{severity}</span>
                          {getSeverityBadge(severity)}
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Keine Daten</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Event Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono">{selectedEvent.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zeit</p>
                  <p>{new Date(selectedEvent.ts).toLocaleString("de-DE")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Art</p>
                  {getKindBadge(selectedEvent.kind)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Severity</p>
                  {getSeverityBadge(selectedEvent.severity)}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nachricht</p>
                <p className="p-2 bg-muted rounded">{selectedEvent.message}</p>
              </div>
              {selectedEvent.meta && (
                <div>
                  <p className="text-sm text-muted-foreground">Metadaten</p>
                  <pre className="p-2 bg-muted rounded text-sm overflow-auto">
                    {JSON.stringify(selectedEvent.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task genehmigen</DialogTitle>
            <DialogDescription>
              Möchten Sie diesen Task wirklich genehmigen? Der STOP-Score
              beträgt <strong>{selectedTask?.stopScore}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleApprove}>Genehmigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
