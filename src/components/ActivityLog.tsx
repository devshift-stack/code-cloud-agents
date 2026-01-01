import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

interface LogEntry {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
  level: "info" | "warning" | "error" | "success";
}

interface ActivityLogProps {
  logs: LogEntry[];
}

export function ActivityLog({ logs }: ActivityLogProps) {
  const levelColors = {
    info: "bg-blue-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    success: "bg-green-500",
  };

  return (
    <Card className="col-span-full" data-testid="cloudagents.activitylog.card">
      <CardHeader>
        <CardTitle data-testid="cloudagents.activitylog.title">
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea
          className="h-80"
          data-testid="cloudagents.activitylog.scrollarea"
        >
          <div className="space-y-3" data-testid="cloudagents.activitylog.list">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                data-testid={`cloudagents.activitylog.entry.${log.id}`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${levelColors[log.level]}`}
                  data-testid={`cloudagents.activitylog.entry.${log.id}.level`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs text-muted-foreground"
                      data-testid={`cloudagents.activitylog.entry.${log.id}.timestamp`}
                    >
                      {log.timestamp}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      data-testid={`cloudagents.activitylog.entry.${log.id}.agent`}
                    >
                      {log.agent}
                    </Badge>
                  </div>
                  <p
                    className="text-sm break-words"
                    data-testid={`cloudagents.activitylog.entry.${log.id}.message`}
                  >
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
