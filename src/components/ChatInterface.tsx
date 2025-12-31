import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { Send, Bot, User } from "lucide-react";

/**
 * Get stored user from localStorage
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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  agentName?: string;
}

interface Agent {
  name: string;
  displayName: string;
  description: string;
}

/**
 * Chat Interface Component
 * Connects to /api/chat/* endpoints
 * Supports 8 AI agents: emir, planner, berater, designer, coder, tester, security, docs
 */
export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("emir");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch available agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/chat/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      toast.error("Failed to load agents");
      // Fallback agents
      setAgents([
        {
          name: "emir",
          displayName: "Emir (Supervisor)",
          description: "Lead supervisor",
        },
        {
          name: "planner",
          displayName: "Planner",
          description: "Task planning",
        },
        {
          name: "berater",
          displayName: "Berater",
          description: "Technical advisory",
        },
        {
          name: "designer",
          displayName: "Designer",
          description: "UI/UX design",
        },
        {
          name: "coder",
          displayName: "Coder",
          description: "Code implementation",
        },
        { name: "tester", displayName: "Tester", description: "Testing & QA" },
        {
          name: "security",
          displayName: "Security",
          description: "Security review",
        },
        { name: "docs", displayName: "Docs", description: "Documentation" },
      ]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const storedUser = getStoredUser();
    if (!storedUser) {
      toast.error("Please log in to send messages");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": storedUser.id,
          "x-user-role": storedUser.role,
        },
        body: JSON.stringify({
          userId: storedUser.id,
          message: input,
          agentName: selectedAgent,
          chatId: chatId,
          includeHistory: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();

      // Set chatId for subsequent messages
      if (!chatId && data.chatId) {
        setChatId(data.chatId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || data.response,
        timestamp: new Date().toISOString(),
        agentName: selectedAgent,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send message",
      );

      // Remove user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>AI Chat</CardTitle>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger
              className="w-[200px]"
              data-testid="cloudagents.chat.agent.select"
            >
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.name} value={agent.name}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{agent.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {agent.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                <Bot className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm">Select an agent and send a message</p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`flex flex-col gap-1 max-w-[80%] ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {message.agentName && message.role === "assistant" && (
                    <span className="text-xs text-muted-foreground">
                      {
                        agents.find((a) => a.name === message.agentName)
                          ?.displayName
                      }
                    </span>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-muted">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex gap-1 items-center bg-muted rounded-lg px-4 py-2">
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              data-testid="cloudagents.chat.message.input"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              data-testid="cloudagents.chat.send.button"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
