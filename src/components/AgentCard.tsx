import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Play, Pause, Settings, Trash2, Activity } from "lucide-react";

interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "stopped";
  language: string;
  lastRun: string;
  executionCount: number;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onConfigure: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AgentCard({
  id,
  name,
  description,
  status,
  language,
  lastRun,
  executionCount,
  onStart,
  onPause,
  onConfigure,
  onDelete,
}: AgentCardProps) {
  const statusColors = {
    active: "bg-green-500",
    paused: "bg-yellow-500",
    stopped: "bg-gray-500",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle>{name}</CardTitle>
              <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
            </div>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Language:</span>
            <Badge variant="outline">{language}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Executions:</span>
            <span className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              {executionCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Run:</span>
            <span>{lastRun}</span>
          </div>
          <div className="flex gap-2 mt-4">
            {status === "active" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPause(id)}
                data-testid={`cloudagents.agent.${id}.pause.button`}
              >
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onStart(id)}
                data-testid={`cloudagents.agent.${id}.start.button`}
              >
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onConfigure(id)}
              data-testid={`cloudagents.agent.${id}.configure.button`}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto text-destructive"
              onClick={() => onDelete(id)}
              data-testid={`cloudagents.agent.${id}.delete.button`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
