import { Agent } from "../types/agent";

export function TeamAgentCard({ agent }: { agent: Agent }) {
  const testIdBase = `cloudagents.teamagent.${agent.id}`;

  return (
    <div className="bg-white p-4 rounded-lg shadow" data-testid={testIdBase}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg" data-testid={`${testIdBase}.name`}>
          Agent {agent.id}
        </h3>
        <span
          className={`px-2 py-1 rounded text-sm ${
            agent.status === "online"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
          data-testid={`${testIdBase}.status`}
        >
          {agent.status}
        </span>
      </div>
      <p
        className="text-gray-600 text-sm mt-1"
        data-testid={`${testIdBase}.role`}
      >
        {agent.role}
      </p>
      <p
        className="text-gray-500 text-sm mt-2"
        data-testid={`${testIdBase}.currenttask`}
      >
        📝 {agent.currentTask}
      </p>
      <p
        className="text-gray-500 text-sm mt-1"
        data-testid={`${testIdBase}.completedtasks`}
      >
        ✅ {agent.completedTasks} tasks completed
      </p>
    </div>
  );
}
