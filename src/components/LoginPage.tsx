import { useState } from "react";
import { toast } from "sonner";

interface LoginPageProps {
  onLoginSuccess: (user: {
    id: string;
    email: string;
    role: string;
    name: string;
  }) => void;
}

/**
 * Login Page Component
 * Connects to POST /api/auth/login endpoint
 */
export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Login failed");
      }

      // Store tokens (new API format)
      const token = data.tokens?.accessToken || data.token;
      const user = data.user;

      if (!token || !user) {
        throw new Error("Invalid response from server");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("Login successful!");

      // Add small delay to ensure storage is complete
      setTimeout(() => {
        onLoginSuccess({
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.displayName || user.email,
        });
      }, 100);
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-lg border shadow-lg">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold">Welcome Back</h2>
            <p className="text-muted-foreground text-sm">
              Sign in to access Code Cloud Agents
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                required
                className="w-full px-3 py-2 border rounded-md bg-background"
                data-testid="cloudagents.auth.login.email.input"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2 border rounded-md bg-background"
                data-testid="cloudagents.auth.login.password.input"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              data-testid="cloudagents.auth.login.submit.button"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p className="font-medium mb-1">Demo Credentials:</p>
            <p className="text-xs">admin@test.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
