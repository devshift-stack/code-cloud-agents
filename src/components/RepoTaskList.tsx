import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { GitBranch, ChevronDown, ChevronRight, ExternalLink, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RepoTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'completed';
  assignedAgent?: string;
  createdAt: string;
  type: 'issue' | 'pr' | 'task';
}

interface Repository {
  name: string;
  org: 'devshift' | 'dsactivi2';
  access: 'read' | 'write';
  tasks: RepoTask[];
}

const mockRepositories: Repository[] = [
  {
    name: 'code-cloud-agents',
    org: 'dsactivi2',
    access: 'write',
    tasks: [
      { id: '1', title: 'Implement Memory Server API', priority: 'high', status: 'in_progress', assignedAgent: 'Cloud Assistant', createdAt: '25.12.', type: 'task' },
      { id: '2', title: 'Fix TypeScript strict mode errors', priority: 'medium', status: 'open', createdAt: '24.12.', type: 'issue' },
      { id: '3', title: 'Add Slack integration', priority: 'high', status: 'completed', assignedAgent: 'Engineering Lead', createdAt: '23.12.', type: 'task' },
    ],
  },
  {
    name: 'mcp-servers',
    org: 'dsactivi2',
    access: 'write',
    tasks: [
      { id: '4', title: 'Research MCP SDK updates', priority: 'medium', status: 'in_progress', assignedAgent: 'Research Agent', createdAt: '25.12.', type: 'task' },
      { id: '5', title: 'Create backup server tests', priority: 'low', status: 'open', createdAt: '24.12.', type: 'issue' },
    ],
  },
  {
    name: 'platform-core',
    org: 'devshift',
    access: 'read',
    tasks: [
      { id: '6', title: 'Review authentication flow', priority: 'high', status: 'open', createdAt: '25.12.', type: 'task' },
      { id: '7', title: 'Analyze API performance', priority: 'medium', status: 'in_progress', assignedAgent: 'Research Agent', createdAt: '24.12.', type: 'task' },
    ],
  },
  {
    name: 'infrastructure',
    org: 'devshift',
    access: 'read',
    tasks: [
      { id: '8', title: 'Document deployment process', priority: 'low', status: 'open', createdAt: '25.12.', type: 'task' },
    ],
  },
];

const priorityColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const statusIcons = {
  open: <AlertCircle className="w-4 h-4 text-gray-400" />,
  in_progress: <Clock className="w-4 h-4 text-blue-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
};

export function RepoTaskList() {
  const [expandedRepos, setExpandedRepos] = useState<string[]>(['code-cloud-agents']);

  const toggleRepo = (repoName: string) => {
    setExpandedRepos((prev) =>
      prev.includes(repoName)
        ? prev.filter((r) => r !== repoName)
        : [...prev, repoName]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Aufgaben nach Repository
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockRepositories.map((repo) => (
          <div key={`${repo.org}/${repo.name}`} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleRepo(repo.name)}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedRepos.includes(repo.name) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="font-medium">{repo.org}/{repo.name}</span>
                <Badge variant={repo.access === 'write' ? 'default' : 'secondary'}>
                  {repo.access === 'write' ? 'R/W' : 'READ'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {repo.tasks.filter((t) => t.status !== 'completed').length} offen
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://github.com/${repo.org}/${repo.name}`, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </button>

            {expandedRepos.includes(repo.name) && (
              <div className="border-t divide-y">
                {repo.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {statusIcons[task.status]}
                      <div>
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.assignedAgent && (
                          <p className="text-xs text-muted-foreground">
                            Zugewiesen: {task.assignedAgent}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{task.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
