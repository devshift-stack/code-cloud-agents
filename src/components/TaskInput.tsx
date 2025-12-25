import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Send, Plus, X } from 'lucide-react';

interface Task {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  status: 'pending' | 'assigned' | 'completed';
}

interface TaskInputProps {
  agents: { id: string; name: string }[];
  onSubmit: (task: Omit<Task, 'id' | 'status'>) => void;
}

export function TaskInput({ agents, onSubmit }: TaskInputProps) {
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  const handleSubmit = () => {
    if (!description.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      description: description.trim(),
      priority,
      assignedTo: assignedTo || undefined,
      status: 'pending',
    };

    setTasks([newTask, ...tasks]);
    onSubmit({ description: newTask.description, priority, assignedTo: newTask.assignedTo });
    setDescription('');
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Neue Aufgabe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Input Row */}
        <div className="flex gap-2">
          <Input
            placeholder="Aufgabe beschreiben..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="flex-1"
          />
          <Button onClick={handleSubmit} size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Options Row */}
        <div className="flex gap-2">
          <Select value={priority} onValueChange={(v) => setPriority(v as Task['priority'])}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Priorität" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Agent zuweisen (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Auto (Meta Supervisor)</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task Queue */}
        {tasks.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <div className="text-xs text-muted-foreground mb-2">Warteschlange ({tasks.length})</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
                  <Badge className={`${priorityColors[task.priority]} text-xs py-0`}>
                    {task.priority}
                  </Badge>
                  <span className="flex-1 truncate">{task.description}</span>
                  {task.assignedTo && (
                    <span className="text-muted-foreground">
                      → {agents.find(a => a.id === task.assignedTo)?.name}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => removeTask(task.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
