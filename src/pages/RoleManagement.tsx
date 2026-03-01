import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRoleManagement } from "@/hooks/useRoleManagement";
import { RoleManagementCard } from "@/components/Admin/RoleManagementCard";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Search, ArrowLeft, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
export default function RoleManagement() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { users, isLoading, assignRole, removeRole } = useRoleManagement();

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      // Check if user has admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some(r => r.role === "admin");
      
      if (!hasAdminRole) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);
    };

    checkAdminAccess();
  }, [navigate]);

  const filteredUsers = users?.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.includes(searchQuery)
  );

  if (isAdmin === null) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page. Only administrators can manage user roles.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Role Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Assign and manage user roles and permissions
            </p>
          </div>
        </div>
      </SidebarHeaderShell>

      <Card>
        <CardHeader>
          <CardTitle>{t('roleManagement.userRoles')}</CardTitle>
          <CardDescription>
            {t('roleManagement.roleDescriptions')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("additionalPlaceholders.searchByEmailUserId")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="grid gap-4">
              {filteredUsers.map(user => (
                <RoleManagementCard
                  key={user.id}
                  user={user}
                  onAssignRole={(userId, role) => assignRole.mutate({ userId, role })}
                  onRemoveRole={(userId, role) => removeRole.mutate({ userId, role })}
                />
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {searchQuery
                  ? "No users found matching your search."
                  : "No users with roles found. Users will appear here once they're assigned roles."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Descriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-medium">
              Admin
            </div>
            <p className="text-sm text-muted-foreground">
              Full system access including user management, company settings, and all projects
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-medium">
              Project Manager
            </div>
            <p className="text-sm text-muted-foreground">
              Can create and manage projects, view all projects, manage budgets and schedules
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-gray-500 text-white px-3 py-1 rounded-md text-sm font-medium">
              Viewer
            </div>
            <p className="text-sm text-muted-foreground">
              Can only view projects they own or have been granted access to
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
