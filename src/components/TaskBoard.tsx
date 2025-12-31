import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { Plus, CheckCircle2, Circle, XCircle, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "future" | "active" | "finished" | "cancelled";
  priority: "low" | "medium" | "high";
  agent?: string;
  repository?: string;
  model?: string;
  tags?: string[];
  dueDate?: string;
  artefacts?: string[];
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  name: string;
  displayName: string;
  description: string;
}

/**
 * Task Board Component
 * Connects to /api/tasks/* endpoints
 */
export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    agent: "emir",
    repository: "",
    model: "claude-3.5-sonnet",
    tags: [] as string[],
    dueDate: "",
    artefacts: [] as string[],
  });

  useEffect(() => {
    fetchTasks();
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/chat/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      toast.error("Failed to load agents");
      // Fallback agents
      setAgents([
        {
          name: "emir",
          displayName: "Emir (Supervisor)",
          description: "Lead supervisor",
        },
        {
          name: "planner",
          displayName: "Planner",
          description: "Task planning",
        },
        {
          name: "coder",
          displayName: "Coder",
          description: "Code implementation",
        },
      ]);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch tasks");

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    try {
      const response = await fetch("/api/tasks/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...newTask,
          status: "future",
        }),
      });

      if (!response.ok) throw new Error("Failed to create task");

      const data = await response.json();
      setTasks((prev) => [...prev, data.task]);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        agent: "emir",
        repository: "",
        model: "claude-3.5-sonnet",
        tags: [],
        dueDate: "",
        artefacts: [],
      });
      setIsCreateDialogOpen(false);
      toast.success("Task created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create task",
      );
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task["status"]) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update task");

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, status, updatedAt: new Date().toISOString() }
            : task,
        ),
      );
      toast.success("Task updated");
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const getTasksByStatus = (status: Task["status"]) => {
    return tasks.filter((task) => task.status === status);
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "future":
        return <Circle className="w-4 h-4" />;
      case "active":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "finished":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-yellow-500";
      case "low":
        return "border-l-green-500";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading tasks...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Task Management</CardTitle>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                data-testid="cloudagents.task.board.create.button"
                data-otop-id="cloudagents.task.board.create.button"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Configure your task with agent, model, and repository settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask((prev) => ({ ...prev, title: e.target.value }))
                    }
                    data-testid="cloudagents.task.board.title.input"
                    data-otop-id="cloudagents.task.board.title.input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Task description"
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    data-testid="cloudagents.task.board.description.textarea"
                    data-otop-id="cloudagents.task.board.description.textarea"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: Task["priority"]) =>
                      setNewTask((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger
                      data-testid="cloudagents.task.board.priority.select"
                      data-otop-id="cloudagents.task.board.priority.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Agent Selection */}
                <div className="space-y-2">
                  <Label htmlFor="agent">Agent</Label>
                  <Select
                    value={newTask.agent}
                    onValueChange={(value) =>
                      setNewTask((prev) => ({ ...prev, agent: value }))
                    }
                  >
                    <SelectTrigger
                      data-testid="cloudagents.task.board.agent.select"
                      data-otop-id="cloudagents.task.board.agent.select"
                    >
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.name} value={agent.name}>
                          {agent.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Repository Selection */}
                <div className="space-y-2">
                  <Label htmlFor="repository">Repository (Optional)</Label>
                  <Input
                    id="repository"
                    placeholder="e.g. code-cloud-agents"
                    value={newTask.repository}
                    onChange={(e) =>
                      setNewTask((prev) => ({
                        ...prev,
                        repository: e.target.value,
                      }))
                    }
                    data-testid="cloudagents.task.board.repository.input"
                    data-otop-id="cloudagents.task.board.repository.input"
                  />
                </div>

                {/* AI Model Selection */}
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={newTask.model}
                    onValueChange={(value) =>
                      setNewTask((prev) => ({ ...prev, model: value }))
                    }
                  >
                    <SelectTrigger
                      data-testid="cloudagents.task.board.model.select"
                      data-otop-id="cloudagents.task.board.model.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3.5-sonnet">
                        Claude 3.5 Sonnet
                      </SelectItem>
                      <SelectItem value="claude-3-opus">
                        Claude 3 Opus
                      </SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">
                        GPT-3.5 Turbo
                      </SelectItem>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Artefacts */}
                <div className="space-y-2">
                  <Label htmlFor="artefacts">Artefacts (Optional)</Label>
                  <Input
                    id="artefacts"
                    placeholder="file1.ts, file2.tsx, ..."
                    value={newTask.artefacts.join(", ")}
                    onChange={(e) => {
                      const artefacts = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      setNewTask((prev) => ({ ...prev, artefacts }));
                    }}
                    data-testid="cloudagents.task.board.artefacts.input"
                    data-otop-id="cloudagents.task.board.artefacts.input"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="cloudagents.task.board.cancel.button"
                    data-otop-id="cloudagents.task.board.cancel.button"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createTask}
                    data-testid="cloudagents.task.board.submit.button"
                    data-otop-id="cloudagents.task.board.submit.button"
                  >
                    Create Task
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="future" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="future">
              Future ({getTasksByStatus("future").length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({getTasksByStatus("active").length})
            </TabsTrigger>
            <TabsTrigger value="finished">
              Finished ({getTasksByStatus("finished").length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({getTasksByStatus("cancelled").length})
            </TabsTrigger>
          </TabsList>

          {(
            ["future", "active", "finished", "cancelled"] as Task["status"][]
          ).map((status) => (
            <TabsContent key={status} value={status} className="space-y-2">
              {getTasksByStatus(status).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No {status} tasks
                </div>
              ) : (
                getTasksByStatus(status).map((task) => (
                  <Card
                    key={task.id}
                    className={`border-l-4 ${getPriorityColor(task.priority)}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(task.status)}
                            <h3 className="font-medium">{task.title}</h3>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="capitalize">
                              Priority: {task.priority}
                            </span>
                            <span>
                              Created:{" "}
                              {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {status === "future" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateTaskStatus(task.id, "active")
                              }
                              data-testid="cloudagents.task.board.task.start.button"
                              data-otop-id="cloudagents.task.board.task.start.button"
                            >
                              Start
                            </Button>
                          )}
                          {status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateTaskStatus(task.id, "finished")
                                }
                                data-testid="cloudagents.task.board.task.complete.button"
                                data-otop-id="cloudagents.task.board.task.complete.button"
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateTaskStatus(task.id, "cancelled")
                                }
                                data-testid="cloudagents.task.board.task.cancel.button"
                                data-otop-id="cloudagents.task.board.task.cancel.button"
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
