import { TeamAgentCard } from "./TeamAgentCard";
import { Agent } from "../types/agent";

const AGENTS: Agent[] = [
  {
    id: 0,
    name: "Agent 0",
    role: "Lead Developer & Orchestrator",
    status: "online",
    currentTask: "Koordiniert Team, macht Code Reviews",
    completedTasks: 13,
  },
  {
    id: 1,
    name: "Agent 1",
    role: "Frontend Developer",
    status: "online",
    currentTask: "Baut Agent List View",
    completedTasks: 1,
  },
  {
    id: 2,
    name: "Agent 2",
    role: "Security & Backend Infrastructure",
    status: "offline",
    currentTask: "Wartet auf Aufgabe",
    completedTasks: 0,
  },
  {
    id: 3,
    name: "Agent 3",
    role: "Integrations & APIs",
    status: "offline",
    currentTask: "Wartet auf Aufgabe",
    completedTasks: 0,
  },
  {
    id: 4,
    name: "Agent 4",
    role: "Documentation & DevOps",
    status: "offline",
    currentTask: "Wartet auf Aufgabe",
    completedTasks: 0,
  },
];

export function TeamAgentList() {
  return (
    <div className="p-6" data-testid="cloudagents.teamagentlist">
      <h2
        className="text-2xl font-bold mb-4"
        data-testid="cloudagents.teamagentlist.title"
      >
        Team Agents
      </h2>
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="cloudagents.teamagentlist.grid"
      >
        {AGENTS.map((agent) => (
          <TeamAgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
