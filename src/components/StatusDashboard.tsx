import { useEffect, useState } from 'react';

interface Stats {
  serverStatus: 'online' | 'offline';
  userCount: number;
  agentCount: number;
  chatCount: number;
}

export function StatusDashboard() {
  const [stats, setStats] = useState<Stats>({
    serverStatus: 'offline',
    userCount: 0,
    agentCount: 5, // Fixwert: Agent 0-4
    chatCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 1. Health Check
    fetch('http://178.156.178.70:3000/health')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setStats(prev => ({ ...prev, serverStatus: 'online' }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats(prev => ({ ...prev, serverStatus: 'offline' }));
        }
      });

    // 2. User Count (TODO: API anpassen wenn verfügbar)
    // Aktuell: Dummy Wert
    if (!cancelled) {
      setStats(prev => ({ ...prev, userCount: 10 }));
    }

    // 3. Memory Stats
    fetch('http://178.156.178.70:3000/api/memory/stats/test-user')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setStats(prev => ({ ...prev, chatCount: data.totalChats || 0 }));
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
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Server Status Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm">Server Status</h3>
        <p className={`text-2xl font-bold ${stats.serverStatus === 'online' ? 'text-green-600' : 'text-red-600'}`}>
          {stats.serverStatus}
        </p>
      </div>

      {/* User Count Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm">Users</h3>
        <p className="text-2xl font-bold text-blue-600">{stats.userCount}</p>
      </div>

      {/* Agent Count Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm">Active Agents</h3>
        <p className="text-2xl font-bold text-purple-600">{stats.agentCount}</p>
      </div>

      {/* Chat Count Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm">Total Chats</h3>
        <p className="text-2xl font-bold text-indigo-600">{stats.chatCount}</p>
      </div>
    </div>
  );
}
