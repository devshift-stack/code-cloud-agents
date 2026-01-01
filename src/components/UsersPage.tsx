/**
 * Users Management Page
 * Admin-only page for user CRUD operations
 */

import { useState, useEffect } from "react";
import { usersApi, authApi, type User } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Key,
  Shield,
  UserCheck,
  AlertCircle,
  Search,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    admins: number;
    users: number;
    demos: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "user" as "admin" | "user" | "demo",
  });
  const [newPassword, setNewPassword] = useState("");

  // Load users and stats
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        usersApi.list(),
        usersApi.stats(),
      ]);
      setUsers(usersRes.users || []);
      setStats(statsRes);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Fehler beim Laden der Benutzer");
    } finally {
      setLoading(false);
    }
  }

  // Create user
  async function handleCreate() {
    try {
      await usersApi.create({
        email: formData.email,
        password: formData.password,
        role: formData.role,
        displayName: formData.displayName || undefined,
      });
      toast.success("Benutzer erstellt");
      setCreateDialogOpen(false);
      setFormData({ email: "", password: "", displayName: "", role: "user" });
      loadData();
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  // Update user
  async function handleUpdate() {
    if (!selectedUser) return;
    try {
      await usersApi.update(selectedUser.id, {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
      });
      toast.success("Benutzer aktualisiert");
      setEditDialogOpen(false);
      setSelectedUser(null);
      loadData();
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  // Delete user
  async function handleDelete() {
    if (!selectedUser) return;
    try {
      await usersApi.delete(selectedUser.id);
      toast.success("Benutzer gelöscht");
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      loadData();
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  // Reset password
  async function handleResetPassword() {
    if (!selectedUser || !newPassword) return;
    try {
      await authApi.resetPassword(selectedUser.id, newPassword);
      toast.success("Passwort zurückgesetzt");
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword("");
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  // Toggle user active status
  async function handleToggleActive(user: User) {
    try {
      await usersApi.update(user.id, { isActive: !user.isActive });
      toast.success(
        user.isActive ? "Benutzer deaktiviert" : "Benutzer aktiviert",
      );
      loadData();
    } catch (error: unknown) {
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : "Unbekannt"}`,
      );
    }
  }

  // Open edit dialog
  function openEditDialog(user: User) {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: "",
      displayName: user.displayName || "",
      role: user.role,
    });
    setEditDialogOpen(true);
  }

  // Filter users
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.displayName?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ),
  );

  // Role badge color
  function getRoleBadge(role: string) {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">{role}</Badge>;
      case "demo":
        return <Badge variant="secondary">{role}</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Benutzerverwaltung
          </h1>
          <p className="text-muted-foreground">
            Benutzer erstellen, bearbeiten und verwalten
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          data-testid="users_button_create"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Neuer Benutzer
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gesamt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <UserCheck className="w-4 h-4" /> Aktiv
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Shield className="w-4 h-4" /> Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.admins}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Demos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.demos}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Refresh */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Benutzer suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="users_input_search"
          />
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Letzter Login</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Laden...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Keine Benutzer gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`users_row_${user.id}`}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.displayName || "-"}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => handleToggleActive(user)}
                        data-testid={`users_switch_active_${user.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString("de-DE")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(user)}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setResetPasswordDialogOpen(true);
                            }}
                          >
                            <Key className="w-4 h-4 mr-2" />
                            Passwort zurücksetzen
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Benutzer erstellen</DialogTitle>
            <DialogDescription>
              Füllen Sie die Felder aus um einen neuen Benutzer zu erstellen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="user@example.com"
                data-testid="users_input_email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Mindestens 8 Zeichen"
                data-testid="users_input_password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Anzeigename</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                placeholder="Max Mustermann"
                data-testid="users_input_displayName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rolle *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "user" | "demo") =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger data-testid="users_select_role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.email || !formData.password}
              data-testid="users_button_submit"
            >
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Benutzerinformationen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-displayName">Anzeigename</Label>
              <Input
                id="edit-displayName"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rolle</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "user" | "demo") =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdate}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Benutzer löschen
            </DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie den Benutzer{" "}
              <strong>{selectedUser?.email}</strong> löschen möchten? Diese
              Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Passwort zurücksetzen
            </DialogTitle>
            <DialogDescription>
              Setzen Sie ein neues Passwort für{" "}
              <strong>{selectedUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Neues Passwort</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                data-testid="users_input_newPassword"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetPasswordDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={newPassword.length < 8}
              data-testid="users_button_resetPassword"
            >
              Passwort setzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
