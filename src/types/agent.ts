export interface Agent {
  id: number;
  name: string;
  role: string;
  status: 'online' | 'offline';
  currentTask: string;
  completedTasks: number;
}
