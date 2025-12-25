import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ListOrdered, Play, MoreHorizontal, Clock, AlertTriangle, Flame } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface PriorityTask {
  id: string;
  rank: number;
  title: string;
  repo: string;
  priority: number; // 1-10 score
  deadline?: string;
  assignedAgent?: string;
  status: 'waiting' | 'ready' | 'in_progress';
  estimatedTime?: string;
}

const mockTopTasks: PriorityTask[] = [
  { id: '1', rank: 1, title: 'Memory Server Pinecone Integration', repo: 'code-cloud-agents', priority: 10, deadline: '26.12.', assignedAgent: 'Cloud Assistant', status: 'in_progress', estimatedTime: '2h' },
  { id: '2', rank: 2, title: 'GitHub API Integration Supervisor', repo: 'code-cloud-agents', priority: 9, deadline: '26.12.', status: 'ready', estimatedTime: '3h' },
  { id: '3', rank: 3, title: 'Qonto API Implementation', repo: 'mcp-servers', priority: 8, deadline: '27.12.', status: 'waiting', estimatedTime: '4h' },
  { id: '4', rank: 4, title: 'Dashboard Performance Optimization', repo: 'code-cloud-agents', priority: 8, assignedAgent: 'Engineering Lead', status: 'in_progress', estimatedTime: '2h' },
  { id: '5', rank: 5, title: 'Slack Webhook Setup', repo: 'code-cloud-agents', priority: 7, deadline: '28.12.', status: 'ready', estimatedTime: '1h' },
  { id: '6', rank: 6, title: 'Unit Tests: Memory Server', repo: 'mcp-servers', priority: 7, status: 'waiting', estimatedTime: '3h' },
  { id: '7', rank: 7, title: 'Error Handling Improvements', repo: 'code-cloud-agents', priority: 6, status: 'waiting', estimatedTime: '2h' },
  { id: '8', rank: 8, title: 'Documentation: MCP Servers', repo: 'mcp-servers', priority: 6, status: 'ready', estimatedTime: '2h' },
  { id: '9', rank: 9, title: 'Monitoring Dashboard Alerts', repo: 'code-cloud-agents', priority: 5, status: 'waiting', estimatedTime: '1h' },
  { id: '10', rank: 10, title: 'Backup Strategy Review', repo: 'infrastructure', priority: 5, status: 'waiting', estimatedTime: '1h' },
];

const getPriorityIcon = (priority: number) => {
  if (priority >= 9) return <Flame className="w-4 h-4 text-red-500" />;
  if (priority >= 7) return <AlertTriangle className="w-4 h-4 text-orange-500" />;
  return <Clock className="w-4 h-4 text-blue-500" />;
};

const getStatusBadge = (status: PriorityTask['status']) => {
  switch (status) {
    case 'in_progress':
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">In Arbeit</Badge>;
    case 'ready':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Bereit</Badge>;
    case 'waiting':
      return <Badge variant="secondary">Wartet</Badge>;
  }
};

export function TopPriorityTasks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListOrdered className="w-5 h-5" />
          Top 10 Prioritäten
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {mockTopTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                  {task.rank}
                </div>
                {getPriorityIcon(task.priority)}
                <div>
                  <p className="font-medium text-sm">{task.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{task.repo}</span>
                    {task.deadline && (
                      <>
                        <span>·</span>
                        <span>Deadline: {task.deadline}</span>
                      </>
                    )}
                    {task.estimatedTime && (
                      <>
                        <span>·</span>
                        <span>~{task.estimatedTime}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {task.assignedAgent && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {task.assignedAgent}
                  </span>
                )}
                {getStatusBadge(task.status)}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  {task.status === 'ready' && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Zuweisen</DropdownMenuItem>
                      <DropdownMenuItem>Priorität ändern</DropdownMenuItem>
                      <DropdownMenuItem>Details anzeigen</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Entfernen</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
