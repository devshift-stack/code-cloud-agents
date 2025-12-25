import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Play, Pause, Settings, Trash2, Activity, MessageSquare, Target, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface DailyTask {
  id: string;
  date: string;
  task: string;
  status: 'completed' | 'failed' | 'in_progress';
}

interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'stopped';
  language: string;
  lastRun: string;
  executionCount: number;
  currentTask?: string;
  stopScore?: number;
  slackChannel?: string;
  dailyTasks?: DailyTask[];
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onConfigure: (id: string) => void;
  onDelete: (id: string) => void;
  onSlackOpen?: (channel: string) => void;
}

export function AgentCard({
  id,
  name,
  description,
  status,
  language,
  lastRun,
  executionCount,
  currentTask,
  stopScore,
  slackChannel,
  dailyTasks = [],
  onStart,
  onPause,
  onConfigure,
  onDelete,
  onSlackOpen,
}: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    active: 'bg-green-500',
    paused: 'bg-yellow-500',
    stopped: 'bg-gray-500',
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-red-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const taskStatusIcon = (status: DailyTask['status']) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'in_progress': return '🔄';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{name}</CardTitle>
              <div className={`w-2 h-2 rounded-full ${statusColors[status]} ${status === 'active' ? 'animate-pulse' : ''}`} />
              {stopScore !== undefined && (
                <Badge variant="outline" className={scoreColor(stopScore)}>
                  Score: {stopScore}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1 text-xs">{description}</CardDescription>
          </div>
          {slackChannel && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => onSlackOpen?.(slackChannel)}
              title={`Slack: ${slackChannel}`}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          {/* Live Status */}
          {currentTask && status === 'active' && (
            <div className="bg-blue-50 dark:bg-blue-950 rounded-md p-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="font-medium text-blue-700 dark:text-blue-300">Live:</span>
                <span className="text-blue-600 dark:text-blue-400 truncate">{currentTask}</span>
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span>{executionCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span>{lastRun}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-muted-foreground" />
              <Badge variant="outline" className="text-xs py-0">{language}</Badge>
            </div>
          </div>

          {/* Daily Tasks Toggle */}
          {dailyTasks.length > 0 && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-7 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                <span>Tagesaufgaben ({dailyTasks.length})</span>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>

              {expanded && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {dailyTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-xs p-1 bg-muted/50 rounded">
                      <span>{taskStatusIcon(task.status)}</span>
                      <span className="text-muted-foreground">{task.date}</span>
                      <span className="truncate flex-1">{task.task}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            {status === 'active' ? (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onPause(id)}>
                <Pause className="w-3 h-3 mr-1" />
                Pause
              </Button>
            ) : (
              <Button size="sm" className="h-7 text-xs" onClick={() => onStart(id)}>
                <Play className="w-3 h-3 mr-1" />
                Start
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => onConfigure(id)}>
              <Settings className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 ml-auto text-destructive"
              onClick={() => onDelete(id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
