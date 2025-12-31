/**
 * Example: How to use the generated API client
 *
 * This file demonstrates the usage of openapi-typescript + openapi-fetch
 * generated from swagger.yaml
 */

import { useEffect, useState } from "react";
import api from "./api-client";
import type { components } from "@/generated/api-types";

// Type-safe types from OpenAPI
type Task = components["schemas"]["Task"];

// ============================================
// EXAMPLE 1: GET /api/tasks (List all tasks)
// ============================================

export function TasksList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Type-safe API call with operationId: tasks_get_api_tasks
      const { data, error: apiError } = await api.GET("/api/tasks");

      if (apiError) {
        setError("Failed to load tasks");
        return;
      }

      setTasks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Tasks ({tasks.length})</h2>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.title} - {task.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// EXAMPLE 2: POST /api/tasks (Create task)
// ============================================

export function CreateTaskForm() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Type-safe API call with operationId: tasks_post_api_tasks
      const { data, error: apiError } = await api.POST("/api/tasks", {
        body: {
          title,
          description: "Created from UI",
          status: "pending",
        },
      });

      if (apiError) {
        setError("Failed to create task");
        return;
      }

      console.log("Task created:", data);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        data-testid="tasks.task.form.title.input"
        data-otop-id="tasks.task.form.title.input"
      />
      <button
        type="submit"
        disabled={loading}
        data-testid="tasks.task.form.submit.button"
        data-otop-id="tasks.task.form.submit.button"
      >
        {loading ? "Creating..." : "Create Task"}
      </button>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </form>
  );
}

// ============================================
// EXAMPLE 3: GET /health (Health check)
// ============================================

export async function checkBackendHealth() {
  // Type-safe API call with operationId: health_get_health
  const { data, error } = await api.GET("/health");

  if (error) {
    return { healthy: false, error: "Backend unreachable" };
  }

  return { healthy: true, data };
}

// ============================================
// EXAMPLE 4: POST /api/enforcement/approve
// ============================================

export async function approveTask(taskId: string, reason: string) {
  // Type-safe API call with operationId: enforcement_post_api_enforcement_approve
  const { data, error } = await api.POST("/api/enforcement/approve", {
    body: {
      taskId,
      approvedBy: "current-user",
      reason,
    },
  });

  if (error) {
    throw new Error("Failed to approve task");
  }

  return data;
}

/**
 * USAGE IN A COMPONENT:
 *
 * import { TasksList, CreateTaskForm } from '@/lib/api-example';
 *
 * function App() {
 *   return (
 *     <div>
 *       <CreateTaskForm />
 *       <TasksList />
 *     </div>
 *   );
 * }
 */
