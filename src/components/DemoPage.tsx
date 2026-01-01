/**
 * Demo Page Component
 *
 * Main entry point for demo system - handles routing between registration and dashboard
 */

import { useState, useEffect } from "react";
import { DemoRegistration } from "./DemoRegistration";
import { DemoDashboard } from "./DemoDashboard";

export function DemoPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string>("");

  // Check for invite code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setInviteCode(code);
    }

    // Check localStorage for existing session
    const storedUserId = localStorage.getItem("demoUserId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  function handleRegistrationSuccess(newUserId: string) {
    setUserId(newUserId);
    localStorage.setItem("demoUserId", newUserId);
  }

  if (userId) {
    return (
      <div data-testid="cloudagents.demopage.dashboard">
        <DemoDashboard userId={userId} />
      </div>
    );
  }

  return (
    <div data-testid="cloudagents.demopage.registration">
      <DemoRegistration
        inviteCode={inviteCode}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
}
