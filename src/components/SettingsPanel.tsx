import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";

export function SettingsPanel() {
  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger
          value="general"
          data-testid="cloudagents.settings.tab.general"
        >
          General
        </TabsTrigger>
        <TabsTrigger value="cloud" data-testid="cloudagents.settings.tab.cloud">
          Cloud
        </TabsTrigger>
        <TabsTrigger
          value="security"
          data-testid="cloudagents.settings.tab.security"
        >
          Security
        </TabsTrigger>
        <TabsTrigger
          value="notifications"
          data-testid="cloudagents.settings.tab.notifications"
        >
          Notifications
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure your workspace preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace Name</Label>
              <Input
                id="workspace"
                placeholder="My Workspace"
                data-testid="cloudagents.settings.general.workspace.input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Default Region</Label>
              <Select defaultValue="us-east-1">
                <SelectTrigger data-testid="cloudagents.settings.general.region.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">
                    US East (N. Virginia)
                  </SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
                  <SelectItem value="ap-southeast-1">
                    Asia Pacific (Singapore)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-save</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save changes
                </p>
              </div>
              <Switch
                defaultChecked
                data-testid="cloudagents.settings.general.autosave.switch"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cloud" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cloud Configuration</CardTitle>
            <CardDescription>
              Manage your cloud provider settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Cloud Provider</Label>
              <Select defaultValue="aws">
                <SelectTrigger data-testid="cloudagents.settings.cloud.provider.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws">Amazon Web Services</SelectItem>
                  <SelectItem value="gcp">Google Cloud Platform</SelectItem>
                  <SelectItem value="azure">Microsoft Azure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="••••••••••••••••"
                data-testid="cloudagents.settings.cloud.apikey.input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret">Secret Key</Label>
              <Input
                id="secret"
                type="password"
                placeholder="••••••••••••••••"
                data-testid="cloudagents.settings.cloud.secret.input"
              />
            </div>
            <Button data-testid="cloudagents.settings.cloud.connect.button">
              Connect Cloud Provider
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>
              Configure security and access controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security
                </p>
              </div>
              <Switch data-testid="cloudagents.settings.security.2fa.switch" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>IP Whitelisting</Label>
                <p className="text-sm text-muted-foreground">
                  Restrict access to specific IP addresses
                </p>
              </div>
              <Switch data-testid="cloudagents.settings.security.ipwhitelist.switch" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Audit Logging</Label>
                <p className="text-sm text-muted-foreground">
                  Track all actions in your workspace
                </p>
              </div>
              <Switch
                defaultChecked
                data-testid="cloudagents.settings.security.audit.switch"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose what updates you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Agent Status Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when agents start or stop
                </p>
              </div>
              <Switch
                defaultChecked
                data-testid="cloudagents.settings.notifications.status.switch"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Error Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts when agents encounter errors
                </p>
              </div>
              <Switch
                defaultChecked
                data-testid="cloudagents.settings.notifications.errors.switch"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Get a summary of agent activity
                </p>
              </div>
              <Switch data-testid="cloudagents.settings.notifications.reports.switch" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                data-testid="cloudagents.settings.notifications.email.input"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
