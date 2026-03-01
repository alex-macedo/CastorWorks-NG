import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SupervisorNotifications {
  total: number;
  pendingDeliveries: number;
  openIssues: number;
  pendingInspections: number;
}

async function fetchSupervisorNotifications(): Promise<SupervisorNotifications> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { total: 0, pendingDeliveries: 0, openIssues: 0, pendingInspections: 0 };
  }

  try {
    // Fetch deliveries
    const deliveriesPromise = (supabase as any)
      .from("delivery_confirmations")
      .select("id")
      .eq("status", "pending");
    
    // Fetch issues
    const issuesPromise = (supabase as any)
      .from("site_issues")
      .select("id")
      .or("status.eq.open,status.eq.in_progress");
    
    // Fetch inspections
    const inspectionsPromise = (supabase as any)
      .from("quality_inspections")
      .select("id")
      .eq("status", "pending");

    const [deliveries, issues, inspections] = await Promise.all([
      deliveriesPromise,
      issuesPromise,
      inspectionsPromise,
    ]);

    const pendingDeliveries = (deliveries?.data?.length as number) || 0;
    const openIssues = (issues?.data?.length as number) || 0;
    const pendingInspections = (inspections?.data?.length as number) || 0;

    return {
      total: pendingDeliveries + openIssues + pendingInspections,
      pendingDeliveries,
      openIssues,
      pendingInspections,
    };
  } catch (error) {
    console.error("Error fetching supervisor notifications:", error);
    return { total: 0, pendingDeliveries: 0, openIssues: 0, pendingInspections: 0 };
  }
}

export function useSupervisorNotifications() {
  return useQuery<SupervisorNotifications>({
    queryKey: ["supervisor-notifications"],
    queryFn: fetchSupervisorNotifications,
    refetchInterval: 30000,
  });
}
