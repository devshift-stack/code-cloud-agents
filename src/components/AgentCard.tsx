/**
 * AgentCard Component - MERGED VERSION
 * Kombiniert: code-cloud-agents (Test-IDs) + PR#4 (Influencer, spokenLanguage, contentAutonomy)
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Play,
  Pause,
  Settings,
  Trash2,
  Activity,
  Sparkles,
  Globe,
} from "lucide-react";

/**
 * Spoken language labels for display
 */
const SPOKEN_LANGUAGE_LABELS: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  bs: "Bosanski",
  sr: "Српски",
};

interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "stopped";
  language: string;
  spokenLanguage?: "de" | "en" | "bs" | "sr"; // NEU aus PR#4
  agentType?: "standard" | "influencer"; // NEU aus PR#4
  contentAutonomy?: boolean; // NEU aus PR#4
  lastRun: string;
  executionCount: number;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onConfigure: (id: string) => void; // BEHALTEN aus code-cloud-agents
  onDelete: (id: string) => void;
}

export function AgentCard({
  id,
  name,
  description,
  status,
  language,
  spokenLanguage,
  agentType,
  contentAutonomy,
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

  const isInfluencer = agentType === "influencer";

  return (
    <Card
      className={`hover:shadow-lg transition-shadow ${isInfluencer ? "border-purple-200 bg-gradient-to-br from-purple-50/50 to-transparent" : ""}`}
      data-testid={`cloudagents.agent.${id}.card`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle
                className="flex items-center gap-2"
                data-testid={`cloudagents.agent.${id}.title`}
              >
                {isInfluencer && (
                  <Sparkles className="w-4 h-4 text-purple-500" />
                )}
                {name}
              </CardTitle>
              <div
                className={`w-2 h-2 rounded-full ${statusColors[status]}`}
                data-testid={`cloudagents.agent.${id}.status`}
              />
              {isInfluencer && (
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700 text-xs"
                  data-testid={`cloudagents.agent.${id}.badge.influencer`}
                >
                  Influencer
                </Badge>
              )}
              {contentAutonomy && (
                <Badge
                  variant="outline"
                  className="border-green-300 text-green-700 text-xs"
                  data-testid={`cloudagents.agent.${id}.badge.autonomy`}
                >
                  Autonom
                </Badge>
              )}
            </div>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Code:</span>
            <Badge
              variant="outline"
              data-testid={`cloudagents.agent.${id}.language`}
            >
              {language}
            </Badge>
          </div>
          {spokenLanguage && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Spricht:
              </span>
              <Badge
                variant="outline"
                className={
                  spokenLanguage === "sr" ? "border-blue-300 bg-blue-50" : ""
                }
                data-testid={`cloudagents.agent.${id}.spokenLanguage`}
              >
                {SPOKEN_LANGUAGE_LABELS[spokenLanguage] || spokenLanguage}
              </Badge>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ausführungen:</span>
            <span
              className="flex items-center gap-1"
              data-testid={`cloudagents.agent.${id}.executions`}
            >
              <Activity className="w-4 h-4" />
              {executionCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Letzte Ausführung:</span>
            <span data-testid={`cloudagents.agent.${id}.lastRun`}>
              {lastRun}
            </span>
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
