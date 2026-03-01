import { useNavigate, useParams } from "react-router-dom";
import { Container } from "@/components/Layout";
import { BudgetDetailContent } from "@/components/Projects/BudgetDetailContent";

/**
 * Budget Detail Page
 * 
 * Displays a single budget with full editing capabilities including:
 * - Project overview and metadata
 * - Line items with SINAPI integration
 * - BDI calculations
 * - Phase reports
 * - Visual dashboards
 */
const BudgetDetail = () => {
  const navigate = useNavigate();
  const { projectId, budgetId } = useParams<{ projectId: string; budgetId: string }>();

  return (
    <Container size="xl">
      {projectId && budgetId && (
        <BudgetDetailContent
          projectId={projectId}
          budgetId={budgetId}
          onBack={() => navigate(projectId ? `/projects/${projectId}/budgets` : '/projects')}
        />
      )}
    </Container>
  );
};

export default BudgetDetail;
