import { useEffect, useState } from "react";

interface Stats {
  serverStatus: "online" | "offline";
  userCount: number;
  agentCount: number;
  chatCount: number;
}

/**
 * Get stored user for auth headers
 */
function getStoredUser(): { id: string; role: string } | null {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Get auth headers for API calls
 */
function getAuthHeaders(): Record<string, string> {
  const user = getStoredUser();
  if (!user) return {};
  return {
    "x-user-id": user.id,
    "x-user-role": user.role,
  };
}

export function StatusDashboard() {
  const [stats, setStats] = useState<Stats>({
    serverStatus: "offline",
    userCount: 0,
    agentCount: 5, // Fixed: 5 agents available
    chatCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();

    // 1. Health Check
    fetch("/api/health")
      .then((res) => res.json())
      .then(() => {
        if (!cancelled) {
          setStats((prev) => ({ ...prev, serverStatus: "online" }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats((prev) => ({ ...prev, serverStatus: "offline" }));
        }
      });

    // 2. User Count (from /api/users/stats - requires admin)
    if (headers["x-user-role"] === "admin") {
      fetch("/api/users/stats", { headers })
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && data.stats) {
            setStats((prev) => ({ ...prev, userCount: data.stats.total || 0 }));
          }
        })
        .catch(() => {
          // Fallback: count remains 0
        });
    }

    // 3. Memory Stats
    const user = getStoredUser();
    const userId = user?.id || "test-user";
    fetch(`/api/memory/stats/${userId}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setStats((prev) => ({ ...prev, chatCount: data.totalChats || 0 }));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      data-testid="cloudagents.statusdashboard"
    >
      {/* Server Status Card */}
      <div
        className="bg-white p-6 rounded-lg shadow"
        data-testid="cloudagents.statusdashboard.card.server"
      >
        <h3 className="text-gray-500 text-sm">Server Status</h3>
        <p
          className={`text-2xl font-bold ${stats.serverStatus === "online" ? "text-green-600" : "text-red-600"}`}
          data-testid="cloudagents.statusdashboard.card.server.value"
        >
          {stats.serverStatus}
        </p>
      </div>

      {/* User Count Card */}
      <div
        className="bg-white p-6 rounded-lg shadow"
        data-testid="cloudagents.statusdashboard.card.users"
      >
        <h3 className="text-gray-500 text-sm">Users</h3>
        <p
          className="text-2xl font-bold text-blue-600"
          data-testid="cloudagents.statusdashboard.card.users.value"
        >
          {stats.userCount}
        </p>
      </div>

      {/* Agent Count Card */}
      <div
        className="bg-white p-6 rounded-lg shadow"
        data-testid="cloudagents.statusdashboard.card.agents"
      >
        <h3 className="text-gray-500 text-sm">Active Agents</h3>
        <p
          className="text-2xl font-bold text-purple-600"
          data-testid="cloudagents.statusdashboard.card.agents.value"
        >
          {stats.agentCount}
        </p>
      </div>

      {/* Chat Count Card */}
      <div
        className="bg-white p-6 rounded-lg shadow"
        data-testid="cloudagents.statusdashboard.card.chats"
      >
        <h3 className="text-gray-500 text-sm">Total Chats</h3>
        <p
          className="text-2xl font-bold text-indigo-600"
          data-testid="cloudagents.statusdashboard.card.chats.value"
        >
          {stats.chatCount}
        </p>
      </div>
    </div>
  );
}
