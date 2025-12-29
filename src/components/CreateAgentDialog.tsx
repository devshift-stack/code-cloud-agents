import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { useState } from 'react';

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (agent: {
    name: string;
    description: string;
    language: string;
    code: string;
  }) => void;
}

export function CreateAgentDialog({ open, onOpenChange, onCreate }: CreateAgentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');

  const handleCreate = () => {
    if (name && description && code) {
      onCreate({ name, description, language, code });
      setName('');
      setDescription('');
      setLanguage('python');
      setCode('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger data-testid="cloudagents.agent.create.language.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="go">Go</SelectItem>
                <SelectItem value="rust">Rust</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="cloudagents.agent.create.cancel.button">
            Cancel
          </Button>
          <Button onClick={handleCreate} data-testid="cloudagents.agent.create.submit.button">Create Agent</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
