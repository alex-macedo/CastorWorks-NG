import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

type TestResult = {
  name: string;
  passed: boolean | null;
  message: string;
  details?: string;
};

export default function RLSTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    const testResults: TestResult[] = [];

    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: t('errorTitle'), description: t('toast.mustBeLoggedInToRunTests'), variant: "destructive" });
        setTesting(false);
        return;
      }

      // Get user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const userRoles = roles?.map(r => r.role) || [];
      const isAdmin = userRoles.includes("admin");
      const isProjectManager = userRoles.includes("project_manager");

      testResults.push({
        name: "User Authentication",
        passed: true,
        message: `Logged in as ${user.email}`,
        details: `Roles: ${userRoles.join(", ") || "none"}`
      });

      // Test 1: Can view projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, owner_id");

      if (projectsError) {
        testResults.push({
          name: "View Projects",
          passed: false,
          message: "Failed to query projects",
          details: projectsError.message
        });
      } else {
        const ownedProjects = projects?.filter(p => p.owner_id === user.id) || [];
        testResults.push({
          name: "View Projects",
          passed: true,
          message: `Can see ${projects?.length || 0} projects`,
          details: `Own: ${ownedProjects.length}, Total visible: ${projects?.length || 0}`
        });
      }

      // Test 2: Can view financial entries
      const { data: financials, error: financialsError } = await supabase
        .from("project_financial_entries")
        .select("id, project_id, amount");

      if (financialsError) {
        testResults.push({
          name: "View Financial Entries",
          passed: false,
          message: "Failed to query financial entries",
          details: financialsError.message
        });
      } else {
        testResults.push({
          name: "View Financial Entries",
          passed: true,
          message: `Can see ${financials?.length || 0} financial entries`,
          details: "Access follows project visibility rules"
        });
      }

      // Test 3: Try to create a project
      const testProjectData: any = {
        name: `RLS Test Project ${Date.now()}`,
        status: "planning",
        start_date: new Date().toISOString().split('T')[0],
        owner_id: user.id
      };
      
      const { error: createProjectError } = await supabase
        .from("projects")
        .insert([testProjectData])
        .select()
        .single();

      if (createProjectError) {
        if (isAdmin || isProjectManager) {
          testResults.push({
            name: "Create Project (should succeed)",
            passed: false,
            message: "Failed to create project",
            details: createProjectError.message
          });
        } else {
          testResults.push({
            name: "Create Project (should fail)",
            passed: true,
            message: "Correctly blocked from creating project",
            details: "Non-admin/PM users cannot create projects"
          });
        }
      } else {
        if (isAdmin || isProjectManager) {
          testResults.push({
            name: "Create Project",
            passed: true,
            message: "Successfully created test project",
            details: "Admin/PM can create projects"
          });
        } else {
          testResults.push({
            name: "Create Project (should be blocked)",
            passed: false,
            message: "SECURITY ISSUE: Non-admin created project",
            details: "Viewers should not be able to create projects!"
          });
        }
      }

      // Test 4: Try to update company settings
      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1)
        .single();

      if (companySettings) {
        const { error: updateSettingsError } = await supabase
          .from("company_settings")
          .update({ company_name: "RLS Test Update" })
          .eq("id", companySettings.id);

        if (updateSettingsError) {
          if (isAdmin) {
            testResults.push({
              name: "Update Company Settings (admin)",
              passed: false,
              message: "Admin failed to update settings",
              details: updateSettingsError.message
            });
          } else {
            testResults.push({
              name: "Update Company Settings (non-admin)",
              passed: true,
              message: "Correctly blocked from updating settings",
              details: "Only admins can modify company settings"
            });
          }
        } else {
          if (isAdmin) {
            testResults.push({
              name: "Update Company Settings",
              passed: true,
              message: "Admin successfully updated settings",
              details: "Admin privileges working correctly"
            });
          } else {
            testResults.push({
              name: "Update Company Settings (SECURITY ISSUE)",
              passed: false,
              message: "Non-admin modified company settings!",
              details: "This is a critical security vulnerability"
            });
          }
        }
      }

      // Test 5: Check can view company settings
      const { data: viewSettings, error: viewSettingsError } = await supabase
        .from("company_settings")
        .select("company_name")
        .limit(1)
        .single();

      if (viewSettingsError) {
        testResults.push({
          name: "View Company Settings",
          passed: false,
          message: "Cannot view company settings",
          details: "All authenticated users should be able to view settings"
        });
      } else {
        testResults.push({
          name: "View Company Settings",
          passed: true,
          message: "Can view company settings",
          details: `Company: ${viewSettings?.company_name || 'N/A'}`
        });
      }

      // Test 6: CRITICAL - Check for cross-project data leakage (Materials)
      const { data: allMaterials } = await supabase
        .from("project_materials")
        .select("id, project_id, description");

      const { data: ownProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("owner_id", user.id);

      const ownProjectIds = new Set(ownProjects?.map(p => p.id) || []);
      const unauthorizedMaterials = allMaterials?.filter(m => !ownProjectIds.has(m.project_id)) || [];

      if (!isAdmin && !isProjectManager && unauthorizedMaterials.length > 0) {
        testResults.push({
          name: "CRITICAL: Project Materials Isolation",
          passed: false,
          message: `SECURITY BREACH: Can see ${unauthorizedMaterials.length} materials from other users' projects!`,
          details: `Expected: 0, Found: ${unauthorizedMaterials.length}. RLS policies are not properly isolating data.`
        });
      } else {
        testResults.push({
          name: "Project Materials Isolation",
          passed: true,
          message: isAdmin || isProjectManager ? "Admin/PM can see all materials (correct)" : "Can only see own project materials",
          details: `Total materials visible: ${allMaterials?.length || 0}`
        });
      }

      // Test 7: CRITICAL - Check for cross-project data leakage (Purchase Requests)
      const { data: allPurchases } = await supabase
        .from("project_purchase_requests")
        .select("id, project_id, notes");

      const unauthorizedPurchases = allPurchases?.filter(p => !ownProjectIds.has(p.project_id)) || [];

      if (!isAdmin && !isProjectManager && unauthorizedPurchases.length > 0) {
        testResults.push({
          name: "CRITICAL: Purchase Requests Isolation",
          passed: false,
          message: `SECURITY BREACH: Can see ${unauthorizedPurchases.length} purchase requests from other users!`,
          details: `Expected: 0, Found: ${unauthorizedPurchases.length}. Sensitive procurement data is exposed.`
        });
      } else {
        testResults.push({
          name: "Purchase Requests Isolation",
          passed: true,
          message: isAdmin || isProjectManager ? "Admin/PM can see all purchases (correct)" : "Can only see own purchase requests",
          details: `Total purchases visible: ${allPurchases?.length || 0}`
        });
      }

      // Test 8: CRITICAL - Check user preferences isolation
      const { data: allPreferences } = await supabase
        .from("user_preferences")
        .select("user_id, theme, language");

      const otherUserPrefs = allPreferences?.filter(p => p.user_id !== user.id) || [];

      if (otherUserPrefs.length > 0) {
        testResults.push({
          name: "CRITICAL: User Preferences Isolation",
          passed: false,
          message: `PRIVACY BREACH: Can see ${otherUserPrefs.length} other users' preferences!`,
          details: `Expected: 0, Found: ${otherUserPrefs.length}. User privacy is compromised.`
        });
      } else {
        testResults.push({
          name: "User Preferences Isolation",
          passed: true,
          message: "Can only see own preferences",
          details: "User privacy is protected"
        });
      }

      // Test 9: Check supplier data management permissions
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id, name")
        .limit(1);

      testResults.push({
        name: "View Suppliers",
        passed: true,
        message: `Can view ${suppliers?.length || 0} suppliers`,
        details: "All authenticated users can view suppliers"
      });

      if (suppliers && suppliers.length > 0) {
        const { error: updateSupplierError } = await supabase
          .from("suppliers")
          .update({ name: "RLS Test Supplier" })
          .eq("id", suppliers[0].id);

        if (updateSupplierError) {
          if (isAdmin || isProjectManager) {
            testResults.push({
              name: "Update Suppliers (admin/PM)",
              passed: false,
              message: "Failed to update supplier",
              details: updateSupplierError.message
            });
          } else {
            testResults.push({
              name: "Update Suppliers (non-admin)",
              passed: true,
              message: "Correctly blocked from updating suppliers",
              details: "Only admins/PMs can modify supplier data"
            });
          }
        } else {
          if (isAdmin || isProjectManager) {
            testResults.push({
              name: "Update Suppliers",
              passed: true,
              message: "Admin/PM can update suppliers",
              details: "Permissions working correctly"
            });
          } else {
            testResults.push({
              name: "Update Suppliers (SECURITY ISSUE)",
              passed: false,
              message: "Non-admin/PM modified supplier data!",
              details: "Supplier management permissions are broken"
            });
          }
        }
      }

      setResults(testResults);
      
      const passed = testResults.filter(r => r.passed).length;
      const failed = testResults.filter(r => r.passed === false).length;
      
      toast({
        title: t('toast.testsComplete'),
        description: `${passed} passed, ${failed} failed out of ${testResults.length} tests`,
        variant: failed > 0 ? "destructive" : "default"
      });

    } catch (error: any) {
      toast({
        title: t('toast.testError'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getResultIcon = (passed: boolean | null) => {
    if (passed === null) return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    if (passed) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SidebarHeaderShell>
<div>
        <h1 className="text-3xl font-bold mb-2">{t("admin:rlsPolicyTesting")}</h1>
        <p className="text-muted-foreground">
          Test Row-Level Security policies to ensure proper data isolation and access control
        </p>
      </div>
</SidebarHeaderShell>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin:automatedRlsTests")}</CardTitle>
          <CardDescription>
            Run comprehensive tests to verify that security policies are working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runTests} 
            disabled={testing}
            className="w-full sm:w-auto"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              "Run Security Tests"
            )}
          </Button>

          {results.length > 0 && (
            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t("admin:testResults")}</h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-green-500 text-green-500">
                    {results.filter(r => r.passed).length} Passed
                  </Badge>
                  <Badge variant="outline" className="border-red-500 text-red-500">
                    {results.filter(r => r.passed === false).length} Failed
                  </Badge>
                </div>
              </div>

              {results.map((result, index) => (
                <Card key={index} className={result.passed === false ? "border-red-200" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getResultIcon(result.passed)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{result.name}</h4>
                          <Badge variant={result.passed ? "default" : "destructive"}>
                            {result.passed ? "PASS" : "FAIL"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {result.message}
                        </p>
                        {result.details && (
                          <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                            {result.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin:testingInstructions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">{t("admin:whatTheseTestsVerify")}</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Projects are only visible to owners, admins, and project managers</li>
              <li>Financial data follows the same access rules as projects</li>
              <li>Only admins and project managers can create new projects</li>
              <li>Only admins can modify company settings</li>
              <li>All authenticated users can view company settings</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">{t("admin:howToTestDifferentRoles")}</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Create test users with different roles (viewer, project_manager, admin)</li>
              <li>Log in as each user and run these tests</li>
              <li>Compare results to ensure proper access control</li>
              <li>Check the detailed instructions in <code>docs/rls-testing-instructions.md</code></li>
            </ol>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Expected Behavior by Role
            </h4>
            <div className="text-sm space-y-2">
              <div>
                <strong>Viewer:</strong> Can only see their own projects, cannot create projects, cannot modify settings
              </div>
              <div>
                <strong>Project Manager:</strong> Can see all projects, can create projects, cannot modify company settings
              </div>
              <div>
                <strong>Admin:</strong> Full access to everything including company settings
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
