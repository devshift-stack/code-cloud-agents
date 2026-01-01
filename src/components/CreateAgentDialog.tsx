/**
 * CreateAgentDialog Component - MERGED VERSION
 * Kombiniert: code-cloud-agents (Test-IDs, DialogDescription, DialogFooter)
 *           + PR#4 (Influencer, spokenLanguage, contentAutonomy, Switch)
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { useState } from "react";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (agent: {
    name: string;
    description: string;
    language: string;
    code: string;
    spokenLanguage?: "de" | "en" | "bs" | "sr"; // NEU aus PR#4
    agentType?: "standard" | "influencer"; // NEU aus PR#4
    contentAutonomy?: boolean; // NEU aus PR#4
  }) => void;
}

/**
 * Spoken language labels for display
 */
const SPOKEN_LANGUAGE_LABELS: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  bs: "Bosanski",
  sr: "Српски (Serbian)",
};

export function CreateAgentDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateAgentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [spokenLanguage, setSpokenLanguage] = useState<
    "de" | "en" | "bs" | "sr"
  >("de");
  const [agentType, setAgentType] = useState<"standard" | "influencer">(
    "standard",
  );
  const [contentAutonomy, setContentAutonomy] = useState(false);

  const handleCreate = () => {
    if (name && description && code) {
      onCreate({
        name,
        description,
        language,
        code,
        spokenLanguage,
        agentType,
        contentAutonomy: agentType === "influencer" ? contentAutonomy : false,
      });
      // Reset form
      setName("");
      setDescription("");
      setLanguage("python");
      setCode("");
      setSpokenLanguage("de");
      setAgentType("standard");
      setContentAutonomy(false);
      onOpenChange(false);
    }
  };

  /**
   * Handle agent type change - auto-enable content autonomy for influencers
   */
  const handleAgentTypeChange = (value: "standard" | "influencer") => {
    setAgentType(value);
    if (value === "influencer") {
      setContentAutonomy(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        data-testid="cloudagents.agent.create.dialog"
      >
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Configure your cloud agent with custom code and settings
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              placeholder="My Automation Agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="cloudagents.agent.create.name.input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What does this agent do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="cloudagents.agent.create.description.input"
            />
          </div>

          {/* Grid für Programmiersprache und gesprochene Sprache */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Programmiersprache</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger data-testid="cloudagents.agent.create.language.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="python"
                    data-testid="cloudagents.agent.create.language.python"
                  >
                    Python
                  </SelectItem>
                  <SelectItem
                    value="javascript"
                    data-testid="cloudagents.agent.create.language.javascript"
                  >
                    JavaScript
                  </SelectItem>
                  <SelectItem
                    value="typescript"
                    data-testid="cloudagents.agent.create.language.typescript"
                  >
                    TypeScript
                  </SelectItem>
                  <SelectItem
                    value="go"
                    data-testid="cloudagents.agent.create.language.go"
                  >
                    Go
                  </SelectItem>
                  <SelectItem
                    value="rust"
                    data-testid="cloudagents.agent.create.language.rust"
                  >
                    Rust
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spokenLanguage">Spricht (Sprache)</Label>
              <Select
                value={spokenLanguage}
                onValueChange={(v) =>
                  setSpokenLanguage(v as "de" | "en" | "bs" | "sr")
                }
              >
                <SelectTrigger data-testid="cloudagents.agent.create.spokenLanguage.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="de"
                    data-testid="cloudagents.agent.create.spokenLanguage.de"
                  >
                    {SPOKEN_LANGUAGE_LABELS.de}
                  </SelectItem>
                  <SelectItem
                    value="en"
                    data-testid="cloudagents.agent.create.spokenLanguage.en"
                  >
                    {SPOKEN_LANGUAGE_LABELS.en}
                  </SelectItem>
                  <SelectItem
                    value="bs"
                    data-testid="cloudagents.agent.create.spokenLanguage.bs"
                  >
                    {SPOKEN_LANGUAGE_LABELS.bs}
                  </SelectItem>
                  <SelectItem
                    value="sr"
                    data-testid="cloudagents.agent.create.spokenLanguage.sr"
                  >
                    {SPOKEN_LANGUAGE_LABELS.sr}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Agent-Typ Auswahl */}
          <div className="space-y-2">
            <Label htmlFor="agentType">Agent-Typ</Label>
            <Select
              value={agentType}
              onValueChange={(v) =>
                handleAgentTypeChange(v as "standard" | "influencer")
              }
            >
              <SelectTrigger data-testid="cloudagents.agent.create.agentType.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="standard"
                  data-testid="cloudagents.agent.create.agentType.standard"
                >
                  Standard Agent
                </SelectItem>
                <SelectItem
                  value="influencer"
                  data-testid="cloudagents.agent.create.agentType.influencer"
                >
                  Influencer Agent
                </SelectItem>
              </SelectContent>
            </Select>
            {agentType === "influencer" && (
              <p
                className="text-xs text-muted-foreground mt-1"
                data-testid="cloudagents.agent.create.influencer.hint"
              >
                Influencer-Agenten können eigenständig Content erstellen und
                veröffentlichen.
              </p>
            )}
          </div>

          {/* Content-Autonomie (nur für Influencer) */}
          {agentType === "influencer" && (
            <div
              className="flex items-center justify-between rounded-lg border p-3 shadow-sm"
              data-testid="cloudagents.agent.create.autonomy.section"
            >
              <div className="space-y-0.5">
                <Label>Content-Autonomie</Label>
                <p className="text-xs text-muted-foreground">
                  Agent erstellt und veröffentlicht Content eigenständig
                </p>
              </div>
              <Switch
                checked={contentAutonomy}
                onCheckedChange={setContentAutonomy}
                data-testid="cloudagents.agent.create.autonomy.switch"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Textarea
              id="code"
              placeholder="# Your agent code here..."
              className="font-mono h-64"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              data-testid="cloudagents.agent.create.code.textarea"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="cloudagents.agent.create.cancel.button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            data-testid="cloudagents.agent.create.submit.button"
          >
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
