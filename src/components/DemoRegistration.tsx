/**
 * Demo Registration Component
 *
 * Public registration page for demo invites
 */

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Gift,
  Clock,
  MessageSquare,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

interface InviteInfo {
  code: string;
  creditLimitUSD: number;
  maxMessages: number;
  maxDays: number;
  expiresAt: string;
  active: boolean;
  available: boolean;
}

interface Props {
  inviteCode?: string;
  onSuccess?: (userId: string) => void;
}

export function DemoRegistration({
  inviteCode: initialCode,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<"code" | "details">("code");
  const [inviteCode, setInviteCode] = useState(initialCode || "");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Load invite info if code provided
  useEffect(() => {
    if (initialCode) {
      loadInviteInfo(initialCode);
    }
  }, [initialCode]);

  async function loadInviteInfo(code: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/demo/invites/${code}`);

      if (!response.ok) {
        throw new Error("Invite code not found or expired");
      }

      const data = await response.json();
      setInviteInfo(data);

      if (!data.available) {
        setError("This invite code is no longer available");
      } else {
        setStep("details");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load invite");
      toast.error("Invalid invite code");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }
    await loadInviteInfo(inviteCode.trim());
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/demo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: inviteCode,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Registration failed");
      }

      const data = await response.json();

      toast.success("Demo account created successfully!");

      if (onSuccess) {
        onSuccess(data.user.id);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (step === "code") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <Gift className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl">Demo Invite</CardTitle>
            <CardDescription>
              Enter your invite code to get started with a free demo account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmitCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="DEMO-XXXX-XXXX-XXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="font-mono text-center"
                  disabled={loading}
                  required
                  data-testid="cloudagents.demo.invite.code.input"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="cloudagents.demo.invite.continue.button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Create Demo Account</CardTitle>
          <CardDescription>
            Complete your registration to activate your demo
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Invite Info */}
          {inviteInfo && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                Your Demo Benefits:
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span>${inviteInfo.creditLimitUSD} Credits</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>{inviteInfo.maxMessages} Messages</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{inviteInfo.maxDays} Days Access</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                data-testid="cloudagents.demo.register.email.input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                minLength={8}
                required
                data-testid="cloudagents.demo.register.password.input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Confirm Password</Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="Re-enter password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={loading}
                required
                data-testid="cloudagents.demo.register.passwordconfirm.input"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("code")}
                disabled={loading}
                className="flex-1"
                data-testid="cloudagents.demo.register.back.button"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
                data-testid="cloudagents.demo.register.submit.button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </form>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
            By creating an account, you agree to our demo terms of service.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
