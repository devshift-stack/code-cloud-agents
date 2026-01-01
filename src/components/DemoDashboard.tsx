/**
 * Demo Dashboard Component
 *
 * Dashboard for demo users showing usage, limits, and expiration
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import {
  DollarSign,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  User,
} from "lucide-react";

interface DemoUser {
  id: string;
  email: string;
  isDemo: true;
  active: boolean;
  blocked: boolean;
  createdAt: string;
  expiresAt: string;
  daysRemaining: number;
  credits: {
    limitUSD: number;
    usedUSD: number;
    remainingUSD: number;
    percentageUsed: number;
  };
  messages: {
    limit: number;
    used: number;
    remaining: number;
    percentageUsed: number;
  };
}

interface Props {
  userId: string;
}

export function DemoDashboard({ userId }: Props) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUserData();
    // Refresh every 30 seconds
    const interval = setInterval(loadUserData, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  async function loadUserData() {
    try {
      const response = await fetch(`/api/demo/users/${userId}`);

      if (!response.ok) {
        throw new Error("Failed to load user data");
      }

      const data = await response.json();
      setUser(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        data-testid="cloudagents.demodashboard.loading"
      >
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <Alert
        variant="destructive"
        data-testid="cloudagents.demodashboard.error"
      >
        <XCircle className="h-4 w-4" />
        <AlertDescription data-testid="cloudagents.demodashboard.error.message">
          {error || "User not found"}
        </AlertDescription>
      </Alert>
    );
  }

  const isExpiringSoon = user.daysRemaining <= 3;
  const isLowCredits = user.credits.remainingUSD < user.credits.limitUSD * 0.2;
  const isLowMessages = user.messages.remaining < user.messages.limit * 0.2;

  return (
    <div className="space-y-6" data-testid="cloudagents.demodashboard">
      {/* Header */}
      <div
        className="flex items-center justify-between"
        data-testid="cloudagents.demodashboard.header"
      >
        <div>
          <h1
            className="text-3xl font-bold"
            data-testid="cloudagents.demodashboard.title"
          >
            Demo Dashboard
          </h1>
          <p
            className="text-gray-500 dark:text-gray-400"
            data-testid="cloudagents.demodashboard.welcome"
          >
            Welcome back, {user.email}
          </p>
        </div>
        <Badge
          variant={user.active && !user.blocked ? "default" : "destructive"}
          data-testid="cloudagents.demodashboard.status"
        >
          {user.active && !user.blocked ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Status Alerts */}
      {user.blocked && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Your demo account has been blocked.
          </AlertDescription>
        </Alert>
      )}

      {!user.blocked && isExpiringSoon && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your demo expires in {user.daysRemaining} day
            {user.daysRemaining !== 1 ? "s" : ""}!
          </AlertDescription>
        </Alert>
      )}

      {!user.blocked && (isLowCredits || isLowMessages) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isLowCredits && "Low on credits. "}
            {isLowMessages && "Low on messages. "}
            Consider upgrading to a paid plan.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div
        className="grid gap-4 md:grid-cols-3"
        data-testid="cloudagents.demodashboard.statsgrid"
      >
        {/* Credits Card */}
        <Card data-testid="cloudagents.demodashboard.card.credits">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Credits Remaining
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="cloudagents.demodashboard.card.credits.value"
            >
              ${user.credits.remainingUSD.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              of ${user.credits.limitUSD.toFixed(2)} total
            </p>
            <Progress
              value={100 - user.credits.percentageUsed}
              className="mt-3"
              indicatorClassName={
                user.credits.percentageUsed > 80
                  ? "bg-red-500"
                  : user.credits.percentageUsed > 60
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }
            />
            <p className="text-xs text-muted-foreground mt-2">
              {user.credits.percentageUsed.toFixed(1)}% used
            </p>
          </CardContent>
        </Card>

        {/* Messages Card */}
        <Card data-testid="cloudagents.demodashboard.card.messages">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Messages Remaining
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="cloudagents.demodashboard.card.messages.value"
            >
              {user.messages.remaining}
            </div>
            <p className="text-xs text-muted-foreground">
              of {user.messages.limit} total
            </p>
            <Progress
              value={100 - user.messages.percentageUsed}
              className="mt-3"
              indicatorClassName={
                user.messages.percentageUsed > 80
                  ? "bg-red-500"
                  : user.messages.percentageUsed > 60
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }
            />
            <p className="text-xs text-muted-foreground mt-2">
              {user.messages.percentageUsed.toFixed(1)}% used
            </p>
          </CardContent>
        </Card>

        {/* Days Remaining Card */}
        <Card data-testid="cloudagents.demodashboard.card.days">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Days Remaining
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid="cloudagents.demodashboard.card.days.value"
            >
              {user.daysRemaining}
            </div>
            <p className="text-xs text-muted-foreground">
              Expires {new Date(user.expiresAt).toLocaleDateString()}
            </p>
            <Progress
              value={(user.daysRemaining / 30) * 100}
              className="mt-3"
              indicatorClassName={
                user.daysRemaining <= 3
                  ? "bg-red-500"
                  : user.daysRemaining <= 7
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }
            />
            <p className="text-xs text-muted-foreground mt-2">
              {user.daysRemaining <= 3 && "Expiring soon!"}
              {user.daysRemaining > 3 &&
                user.daysRemaining <= 7 &&
                "Expiring this week"}
              {user.daysRemaining > 7 && "Active"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Info */}
      <Card data-testid="cloudagents.demodashboard.card.accountinfo">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your demo account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Created</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Expires</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(user.expiresAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {user.active && !user.blocked ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">Status</span>
              </div>
              <Badge
                variant={
                  user.active && !user.blocked ? "default" : "destructive"
                }
              >
                {user.active && !user.blocked ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card data-testid="cloudagents.demodashboard.card.tips">
        <CardHeader>
          <CardTitle>Tips for Your Demo</CardTitle>
          <CardDescription>Make the most of your trial period</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Monitor your credit usage to avoid running out early</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Use shorter messages to conserve your message quota</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Upgrade to a paid plan before your demo expires to keep your
                data
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
