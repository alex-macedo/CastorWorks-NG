import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { authenticateRequest, createServiceRoleClient } from '../_shared/authorization.ts'
import { getAICompletion } from '../_shared/aiProviderClient.ts'
import {
  BULK_LIMIT,
  OVERRIDE_PHRASE,
  executeUpdateTasksUntilToday,
  extractProjectIdentifier,
} from '../_shared/superBotUpdateTasks.ts'

type AssistantIntent =
  | "delayed_projects"
  | "due_payments"
  | "update_tasks_until_today"
  | "quotes_without_vendor_proposal"
  | "unknown";

type AssistantResult = {
  intent: AssistantIntent;
  tool: string;
  data: unknown;
};

type QueueStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "exhausted"
  | "cancelled";
type SupportedLanguage = "pt-BR" | "en-US" | "es-ES" | "fr-FR";

type LLMIntentPayload = {
  intent: AssistantIntent;
  project_identifier?: string | null;
  until_date?: string | null;
  as_of_date?: string | null;
  force_update?: boolean;
  override_phrase?: string | null;
};

export type SuperBotDependencies = {
  authenticateRequest?: typeof authenticateRequest;
  createServiceRoleClient?: typeof createServiceRoleClient;
  getAICompletion?: typeof getAICompletion;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LIMIT = 100
const DEFAULT_LANGUAGE: SupportedLanguage = 'en-US'

const isSupportedLanguage = (value: string): value is SupportedLanguage =>
  ["pt-BR", "en-US", "es-ES", "fr-FR"].includes(value);

const getLanguage = (value: unknown): SupportedLanguage => {
  const normalized = String(value || "").trim();
  return isSupportedLanguage(normalized) ? normalized : DEFAULT_LANGUAGE;
};

type SuperBotCopy = {
  delayedProjectsHeading: string;
  delayedProjectsEmpty: string;
  delayedProjectItem: (project: string, count: number) => string;
  delayedTaskItem: (title: string, dueDate: string) => string;
  duePaymentsHeading: string;
  duePaymentsEmpty: string;
  duePaymentsClientItem: (client: string, count: number) => string;
  duePaymentsInvoiceItem: (
    invoice: string,
    dueDate: string,
    status: string,
  ) => string;
  quotesHeading: string;
  quotesEmpty: string;
  quotesItem: (
    requestNumber: string,
    supplier: string,
    deadline: string,
    status: string,
  ) => string;
  unauthorized: (role: string) => string;
  projectRequired: string;
  projectNotFound: (identifier: string) => string;
  guardrailBlocked: (count: number) => string;
  noPendingTasks: (projectName: string, untilDate: string) => string;
  tasksUpdated: (
    count: number,
    projectName: string,
    untilDate: string,
  ) => string;
  unknownIntent: string;
  operationFailed: (reason: string) => string;
};

const copyByLanguage: Record<SupportedLanguage, SuperBotCopy> = {
  "en-US": {
    delayedProjectsHeading: "### Delayed Projects and Tasks",
    delayedProjectsEmpty:
      "No delayed tasks were found for accessible projects.",
    delayedProjectItem: (project, count) =>
      `- **${project}** (${count} delayed tasks)`,
    delayedTaskItem: (title, dueDate) => `  - ${title} (due: ${dueDate})`,
    duePaymentsHeading: "### Clients with Due Payments",
    duePaymentsEmpty: "No due payments were found.",
    duePaymentsClientItem: (client, count) =>
      `- **${client}** (${count} invoices)`,
    duePaymentsInvoiceItem: (invoice, dueDate, status) =>
      `  - ${invoice} | due ${dueDate} | status ${status}`,
    quotesHeading: "### Overdue Quote Requests without Vendor Proposal",
    quotesEmpty:
      "No overdue quote requests pending vendor proposal were found.",
    quotesItem: (requestNumber, supplier, deadline, status) =>
      `- ${requestNumber} | vendor: **${supplier}** | deadline: ${deadline} | status: ${status}`,
    unauthorized: (role) =>
      [
        "You are not authorized to run this operation with your current role.",
        `Role: ${role}`,
        "Please contact an administrator if this access is required.",
      ].join("\n"),
    projectRequired:
      'Please specify the project name or id in quotes, for example: update tasks for project "Project X" until today.',
    projectNotFound: (identifier) =>
      `Project not found for identifier: ${identifier}`,
    guardrailBlocked: (count) =>
      `Guardrail blocked: ${count} tasks would be updated (> ${BULK_LIMIT}). Retry with forceUpdate=true and overridePhrase="${OVERRIDE_PHRASE}".`,
    noPendingTasks: (projectName, untilDate) =>
      `No pending tasks found for project ${projectName} up to ${untilDate}.`,
    tasksUpdated: (count, projectName, untilDate) =>
      `Updated ${count} tasks to completed for project ${projectName} up to ${untilDate}.`,
    unknownIntent: [
      "I can help with these operations:",
      "- Show delayed projects and tasks",
      "- Show clients with due payments",
      "- Update project tasks up to today",
      "- Show overdue quote requests without vendor proposal",
    ].join("\n"),
    operationFailed: (reason) =>
      [
        "I could not complete that operation right now.",
        `Reason: ${reason}`,
        "Please try again in a moment.",
      ].join("\n"),
  },
  "pt-BR": {
    delayedProjectsHeading: "### Projetos Atrasados e Tarefas",
    delayedProjectsEmpty:
      "Nenhuma tarefa atrasada foi encontrada nos projetos acessíveis.",
    delayedProjectItem: (project, count) =>
      `- **${project}** (${count} tarefas atrasadas)`,
    delayedTaskItem: (title, dueDate) =>
      `  - ${title} (vencimento: ${dueDate})`,
    duePaymentsHeading: "### Clientes com Pagamentos em Aberto",
    duePaymentsEmpty: "Nenhum pagamento em aberto foi encontrado.",
    duePaymentsClientItem: (client, count) =>
      `- **${client}** (${count} faturas)`,
    duePaymentsInvoiceItem: (invoice, dueDate, status) =>
      `  - ${invoice} | vence em ${dueDate} | status ${status}`,
    quotesHeading: "### Cotações Vencidas sem Proposta do Fornecedor",
    quotesEmpty:
      "Nenhuma cotação vencida sem proposta do fornecedor foi encontrada.",
    quotesItem: (requestNumber, supplier, deadline, status) =>
      `- ${requestNumber} | fornecedor: **${supplier}** | prazo: ${deadline} | status: ${status}`,
    unauthorized: (role) =>
      [
        "Você não tem autorização para executar esta operação com o seu perfil atual.",
        `Perfil: ${role}`,
        "Fale com um administrador se esse acesso for necessário.",
      ].join("\n"),
    projectRequired:
      'Informe o nome ou o id do projeto entre aspas, por exemplo: atualizar tarefas do projeto "Projeto X" até hoje.',
    projectNotFound: (identifier) =>
      `Projeto não encontrado para o identificador: ${identifier}`,
    guardrailBlocked: (count) =>
      `Bloqueio de segurança: ${count} tarefas seriam atualizadas (> ${BULK_LIMIT}). Tente novamente com forceUpdate=true e overridePhrase="${OVERRIDE_PHRASE}".`,
    noPendingTasks: (projectName, untilDate) =>
      `Nenhuma tarefa pendente foi encontrada para o projeto ${projectName} até ${untilDate}.`,
    tasksUpdated: (count, projectName, untilDate) =>
      `${count} tarefas foram atualizadas para concluídas no projeto ${projectName} até ${untilDate}.`,
    unknownIntent: [
      "Posso ajudar com estas operações:",
      "- Mostrar projetos e tarefas atrasadas",
      "- Mostrar clientes com pagamentos em aberto",
      "- Atualizar tarefas do projeto até hoje",
      "- Mostrar cotações vencidas sem proposta do fornecedor",
    ].join("\n"),
    operationFailed: (reason) =>
      [
        "Não consegui concluir essa operação agora.",
        `Motivo: ${reason}`,
        "Tente novamente em alguns instantes.",
      ].join("\n"),
  },
  "es-ES": {
    delayedProjectsHeading: "### Proyectos Retrasados y Tareas",
    delayedProjectsEmpty:
      "No se encontraron tareas retrasadas en los proyectos accesibles.",
    delayedProjectItem: (project, count) =>
      `- **${project}** (${count} tareas retrasadas)`,
    delayedTaskItem: (title, dueDate) => `  - ${title} (vence: ${dueDate})`,
    duePaymentsHeading: "### Clientes con Pagos Pendientes",
    duePaymentsEmpty: "No se encontraron pagos pendientes.",
    duePaymentsClientItem: (client, count) =>
      `- **${client}** (${count} facturas)`,
    duePaymentsInvoiceItem: (invoice, dueDate, status) =>
      `  - ${invoice} | vence ${dueDate} | estado ${status}`,
    quotesHeading:
      "### Solicitudes de Cotización Vencidas sin Propuesta del Proveedor",
    quotesEmpty:
      "No se encontraron solicitudes de cotización vencidas pendientes de propuesta.",
    quotesItem: (requestNumber, supplier, deadline, status) =>
      `- ${requestNumber} | proveedor: **${supplier}** | fecha límite: ${deadline} | estado: ${status}`,
    unauthorized: (role) =>
      [
        "No tienes autorización para ejecutar esta operación con tu rol actual.",
        `Rol: ${role}`,
        "Contacta a un administrador si necesitas este acceso.",
      ].join("\n"),
    projectRequired:
      'Indica el nombre o el id del proyecto entre comillas, por ejemplo: actualizar tareas del proyecto "Proyecto X" hasta hoy.',
    projectNotFound: (identifier) =>
      `No se encontró el proyecto para el identificador: ${identifier}`,
    guardrailBlocked: (count) =>
      `Bloqueo de seguridad: se actualizarían ${count} tareas (> ${BULK_LIMIT}). Vuelve a intentarlo con forceUpdate=true y overridePhrase="${OVERRIDE_PHRASE}".`,
    noPendingTasks: (projectName, untilDate) =>
      `No se encontraron tareas pendientes para el proyecto ${projectName} hasta ${untilDate}.`,
    tasksUpdated: (count, projectName, untilDate) =>
      `Se actualizaron ${count} tareas a completadas para el proyecto ${projectName} hasta ${untilDate}.`,
    unknownIntent: [
      "Puedo ayudarte con estas operaciones:",
      "- Mostrar proyectos y tareas retrasadas",
      "- Mostrar clientes con pagos pendientes",
      "- Actualizar tareas del proyecto hasta hoy",
      "- Mostrar solicitudes de cotización vencidas sin propuesta del proveedor",
    ].join("\n"),
    operationFailed: (reason) =>
      [
        "No pude completar esa operación en este momento.",
        `Motivo: ${reason}`,
        "Vuelve a intentarlo en unos instantes.",
      ].join("\n"),
  },
  "fr-FR": {
    delayedProjectsHeading: "### Projets en Retard et Tâches",
    delayedProjectsEmpty:
      "Aucune tâche en retard n’a été trouvée pour les projets accessibles.",
    delayedProjectItem: (project, count) =>
      `- **${project}** (${count} tâches en retard)`,
    delayedTaskItem: (title, dueDate) => `  - ${title} (échéance : ${dueDate})`,
    duePaymentsHeading: "### Clients avec Paiements Dus",
    duePaymentsEmpty: "Aucun paiement dû n’a été trouvé.",
    duePaymentsClientItem: (client, count) =>
      `- **${client}** (${count} factures)`,
    duePaymentsInvoiceItem: (invoice, dueDate, status) =>
      `  - ${invoice} | échéance ${dueDate} | statut ${status}`,
    quotesHeading:
      "### Demandes de Devis en Retard sans Proposition du Fournisseur",
    quotesEmpty:
      "Aucune demande de devis en retard sans proposition fournisseur n’a été trouvée.",
    quotesItem: (requestNumber, supplier, deadline, status) =>
      `- ${requestNumber} | fournisseur : **${supplier}** | date limite : ${deadline} | statut : ${status}`,
    unauthorized: (role) =>
      [
        "Vous n’êtes pas autorisé à exécuter cette opération avec votre rôle actuel.",
        `Rôle : ${role}`,
        "Veuillez contacter un administrateur si cet accès est nécessaire.",
      ].join("\n"),
    projectRequired:
      'Veuillez préciser le nom ou l’identifiant du projet entre guillemets, par exemple : mettre à jour les tâches du projet "Projet X" jusqu’à aujourd’hui.',
    projectNotFound: (identifier) =>
      `Projet introuvable pour l’identifiant : ${identifier}`,
    guardrailBlocked: (count) =>
      `Blocage de sécurité : ${count} tâches seraient mises à jour (> ${BULK_LIMIT}). Réessayez avec forceUpdate=true et overridePhrase="${OVERRIDE_PHRASE}".`,
    noPendingTasks: (projectName, untilDate) =>
      `Aucune tâche en attente n’a été trouvée pour le projet ${projectName} jusqu’au ${untilDate}.`,
    tasksUpdated: (count, projectName, untilDate) =>
      `${count} tâches ont été marquées comme terminées pour le projet ${projectName} jusqu’au ${untilDate}.`,
    unknownIntent: [
      "Je peux vous aider avec ces opérations :",
      "- Afficher les projets et tâches en retard",
      "- Afficher les clients avec des paiements dus",
      "- Mettre à jour les tâches du projet jusqu’à aujourd’hui",
      "- Afficher les demandes de devis en retard sans proposition fournisseur",
    ].join("\n"),
    operationFailed: (reason) =>
      [
        "Je n’ai pas pu terminer cette opération pour le moment.",
        `Raison : ${reason}`,
        "Veuillez réessayer dans un instant.",
      ].join("\n"),
  },
};

const nowDate = () => new Date().toISOString().slice(0, 10)

const RETRYABLE_INTENTS: AssistantIntent[] = [
  "delayed_projects",
  "due_payments",
  "quotes_without_vendor_proposal",
  "update_tasks_until_today",
];

const summarizeDelayedProjects = (
  rows: Array<Record<string, unknown>>,
  language: SupportedLanguage,
) => {
  const copy = copyByLanguage[language];
  const byProject = new Map<string, Array<Record<string, unknown>>>();

  for (const row of rows) {
    const projectName = String(
      (row.projects as { name?: string } | null)?.name || "Unknown project",
    );
    const list = byProject.get(projectName) || [];
    list.push(row);
    byProject.set(projectName, list);
  }

  const lines: string[] = [copy.delayedProjectsHeading];
  for (const [project, tasks] of byProject.entries()) {
    lines.push(copy.delayedProjectItem(project, tasks.length));
    for (const task of tasks.slice(0, 8)) {
      lines.push(
        copy.delayedTaskItem(
          String(task.title),
          String(task.due_date || "n/a"),
        ),
      );
    }
  }

  if (byProject.size === 0) {
    return copy.delayedProjectsEmpty;
  }

  return lines.join("\n");
};

const summarizeDuePayments = (
  rows: Array<Record<string, unknown>>,
  language: SupportedLanguage,
) => {
  const copy = copyByLanguage[language];
  if (rows.length === 0) return copy.duePaymentsEmpty;

  const grouped = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows) {
    const client = String(
      row.client_name || row.project_name || "Unknown client",
    );
    const list = grouped.get(client) || [];
    list.push(row);
    grouped.set(client, list);
  }

  const lines: string[] = [copy.duePaymentsHeading];
  for (const [client, invoices] of grouped.entries()) {
    lines.push(copy.duePaymentsClientItem(client, invoices.length));
    for (const inv of invoices.slice(0, 6)) {
      lines.push(copy.duePaymentsInvoiceItem(
        String(inv.invoice_number || inv.id),
        String(inv.due_date || "n/a"),
        String(inv.status || "n/a"),
      ));
    }
  }

  return lines.join("\n");
};

const summarizeQuotes = (
  rows: Array<Record<string, unknown>>,
  language: SupportedLanguage,
) => {
  const copy = copyByLanguage[language];
  if (rows.length === 0) return copy.quotesEmpty;

  const lines: string[] = [copy.quotesHeading];
  for (const row of rows.slice(0, DEFAULT_LIMIT)) {
    const supplier = String(
      (row.suppliers as { name?: string } | null)?.name || "Unknown supplier",
    );
    const reqNum = String(row.request_number || row.id);
    const deadline = String(row.response_deadline || "n/a");
    const status = String(row.status || "n/a");
    lines.push(copy.quotesItem(reqNum, supplier, deadline, status));
  }

  return lines.join("\n");
};

const detectIntent = (message: string): AssistantIntent => {
  const normalized = message.toLowerCase();

  if (
    (normalized.includes("delay") || normalized.includes("atras")) &&
    normalized.includes("project")
  ) {
    return "delayed_projects";
  }

  if (
    (normalized.includes("payment") || normalized.includes("invoice") ||
      normalized.includes("pagamento")) &&
    (normalized.includes("due") || normalized.includes("overdue") ||
      normalized.includes("venc"))
  ) {
    return "due_payments";
  }

  if (
    (normalized.includes("update") || normalized.includes("close") ||
      normalized.includes("mark")) &&
    normalized.includes("task") &&
    (normalized.includes("until today") || normalized.includes("as of today") ||
      normalized.includes("hoje"))
  ) {
    return "update_tasks_until_today";
  }

  if (
    (normalized.includes("quote") || normalized.includes("cot")) &&
    (normalized.includes("vendor") || normalized.includes("fornecedor")) &&
    (normalized.includes("did not return") || normalized.includes("without") ||
      normalized.includes("nao"))
  ) {
    return "quotes_without_vendor_proposal";
  }

  return "unknown";
};

const parseIntentWithLLM = async (
  message: string,
  aiCompletion: typeof getAICompletion = getAICompletion,
): Promise<LLMIntentPayload | null> => {
  const systemMessage = [
    "You extract tool intents for a construction management assistant.",
    "Return strict JSON only, with no markdown and no prose.",
    "Allowed intents: delayed_projects, due_payments, update_tasks_until_today, quotes_without_vendor_proposal, unknown.",
    "When project is present, include project_identifier.",
    'For phrases like "today", set until_date and as_of_date to current_date.',
    "Schema:",
    '{"intent":"...", "project_identifier":string|null, "until_date":string|null, "as_of_date":string|null, "force_update":boolean, "override_phrase":string|null}',
  ].join("\n");

  const completion = await aiCompletion({
    prompt: `User message: ${message}`,
    systemMessage,
    maxTokens: 220,
    temperature: 0,
  });

  const raw = completion.content?.trim() || "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as LLMIntentPayload;
    const allowed: AssistantIntent[] = [
      "delayed_projects",
      "due_payments",
      "update_tasks_until_today",
      "quotes_without_vendor_proposal",
      "unknown",
    ];

    if (!allowed.includes(parsed.intent)) return null;
    return parsed;
  } catch {
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startedAt = Date.now();
  const traceId = crypto.randomUUID();
  const authenticate = overrides.authenticateRequest || authenticateRequest;
  const createClient = overrides.createServiceRoleClient ||
    createServiceRoleClient;
  const aiCompletion = overrides.getAICompletion || getAICompletion;

  try {
    const { user } = await authenticate(req);
    const supabase = createClient();

    const body = await req.json();
    const message = String(body?.message || "").trim();
    const sessionId = String(body?.sessionId || "").trim();
    const language = getLanguage(body?.language);
    const copy = copyByLanguage[language];
    const forceUpdate = Boolean(body?.forceUpdate);
    const overridePhrase = String(body?.overridePhrase || "").trim()
      .toLowerCase();

    if (!message || !sessionId) {
      return new Response(
        JSON.stringify({ error: "message and sessionId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const logEvent = async (
      level: "debug" | "info" | "warning" | "error",
      text: string,
      category: string,
      context: Record<string, unknown> = {},
      severity: "low" | "medium" | "high" | "critical" = "low",
    ) => {
      try {
        await supabase.rpc("log_message", {
          p_level: level,
          p_message: text,
          p_context: {
            ...context,
            session_id: sessionId,
            request_id: traceId,
            user_agent: req.headers.get("user-agent") || "unknown",
          },
          p_category: category,
          p_component: "super-bot-assistant",
          p_severity: severity,
          p_trace_id: traceId,
          p_request_url: req.url,
          p_request_method: req.method,
          p_environment: Deno.env.get("SUPABASE_ENV") || "production",
        });
      } catch (err) {
        console.error("[super-bot log_message failed]", err);
      }
    };

    const getPrimaryRole = async (userId: string): Promise<string> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1);

      if (error) {
        await logEvent(
          "warning",
          "Unable to load user role, defaulting to viewer",
          "ai.superbot.role",
          {
            error: error.message,
          },
        );
        return "viewer";
      }

      return String(data?.[0]?.role || "viewer");
    };

    const trackAnalyticsEvent = async (params: {
      event_type: string;
      role: string;
      intent?: AssistantIntent;
      tool_name?: string;
      status?: string;
      duration_ms?: number;
      context?: Record<string, unknown>;
      queue_job_id?: string;
    }) => {
      try {
        await supabase.from("castormind_analytics_events").insert({
          event_type: params.event_type,
          request_id: traceId,
          trace_id: traceId,
          session_id: sessionId,
          user_id: user.id,
          role: params.role,
          intent: params.intent,
          tool_name: params.tool_name,
          status: params.status,
          duration_ms: params.duration_ms,
          queue_job_id: params.queue_job_id,
          context: params.context || {},
        });
      } catch (analyticsError) {
        await logEvent(
          "warning",
          "Analytics event write failed",
          "ai.superbot.analytics.error",
          {
            event_type: params.event_type,
            error: analyticsError instanceof Error
              ? analyticsError.message
              : String(analyticsError),
          },
        );
      }
    };

    const enqueueRetryJob = async (params: {
      role: string;
      intent: AssistantIntent;
      payload: Record<string, unknown>;
      last_error: string;
      status?: QueueStatus;
    }) => {
      try {
        const { data, error } = await supabase
          .from("castormind_retry_queue")
          .insert({
            request_id: traceId,
            trace_id: traceId,
            session_id: sessionId,
            user_id: user.id,
            role: params.role,
            intent: params.intent,
            payload: params.payload,
            status: params.status || "queued",
            attempts: 0,
            max_attempts: 5,
            next_run_at: new Date().toISOString(),
            backoff_seconds: 60,
            last_error: params.last_error,
          })
          .select("id")
          .single();

        if (error) throw error;

        await logEvent(
          "info",
          "Retry job enqueued",
          "ai.superbot.queue.enqueued",
          {
            queue_job_id: data?.id || null,
            intent: params.intent,
            retryable: RETRYABLE_INTENTS.includes(params.intent),
          },
        );

        await trackAnalyticsEvent({
          event_type: "queue_enqueued",
          role: params.role,
          intent: params.intent,
          status: "queued",
          queue_job_id: data?.id || undefined,
        });
      } catch (queueError) {
        await logEvent(
          "error",
          "Failed to enqueue retry job",
          "ai.superbot.queue.error",
          {
            intent: params.intent,
            error: queueError instanceof Error
              ? queueError.message
              : String(queueError),
          },
        );
      }
    };

    let llmIntent: LLMIntentPayload | null = null;
    try {
      llmIntent = await parseIntentWithLLM(message, aiCompletion);
    } catch (llmError) {
      await logEvent(
        "warning",
        "LLM intent parsing failed, fallback to deterministic parser",
        "ai.superbot.intent",
        {
          llm_error: llmError instanceof Error
            ? llmError.message
            : String(llmError),
        },
      );
    }
    const intent = llmIntent?.intent || detectIntent(message);
    const userRole = await getPrimaryRole(user.id);
    await logEvent("info", "Intent detected", "ai.superbot.intent", {
      intent,
      message,
      user_role: userRole,
      llm_intent_used: Boolean(llmIntent),
      llm_intent: llmIntent || null,
    });

    await trackAnalyticsEvent({
      event_type: "request_start",
      role: userRole,
      intent,
      status: "started",
      context: { llm_intent_used: Boolean(llmIntent) },
    });

    const results: AssistantResult[] = [];
    let assistantMessage = "";
    let toolErrorOccurred = false;

    if (intent !== "unknown") {
      const { data: permissionRows, error: permissionError } = await supabase
        .from("castormind_tool_permissions")
        .select("is_allowed")
        .eq("role", userRole)
        .eq("intent", intent)
        .limit(1);

      if (permissionError) {
        await logEvent(
          "error",
          "Permission lookup failed",
          "ai.superbot.permission.error",
          {
            intent,
            role: userRole,
            error: permissionError.message,
          },
        );
      }

      const isAllowed = Boolean(permissionRows?.[0]?.is_allowed);
      if (!isAllowed) {
        assistantMessage = [
          copy.unauthorized(userRole),
        ].join("\n");

        await logEvent(
          "warning",
          "Intent blocked by role policy",
          "ai.superbot.permission.blocked",
          {
            intent,
            role: userRole,
          },
        );

        await trackAnalyticsEvent({
          event_type: "request_finish",
          role: userRole,
          intent,
          status: "guardrail_blocked",
          duration_ms: Date.now() - startedAt,
        });

        await supabase.from("ai_chat_messages").insert([
          {
            user_id: user.id,
            session_id: sessionId,
            role: "user",
            message,
          },
          {
            user_id: user.id,
            session_id: sessionId,
            role: "assistant",
            message: assistantMessage,
            function_calls: [],
          },
        ]);

        await logEvent(
          "warning",
          "Super Bot request completed",
          "ai.superbot.response",
          {
            intent,
            duration_ms: Date.now() - startedAt,
            results_count: 0,
            user_role: userRole,
            blocked: true,
          },
          "medium",
        );

        return new Response(
          JSON.stringify({
            message: assistantMessage,
            results: [],
            traceId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    try {
      if (intent === "delayed_projects") {
        await logEvent(
          "info",
          "Executing delayed_projects tool",
          "ai.superbot.tool.start",
          { tool: "get_delayed_projects_with_tasks" },
        );

        const asOfDate =
          llmIntent?.as_of_date && llmIntent.as_of_date !== "current_date"
            ? llmIntent.as_of_date
            : nowDate();
        const { data, error } = await supabase
          .from("architect_tasks")
          .select(`
          id,
          title,
          due_date,
          status,
          project_id,
          projects!architect_tasks_project_id_fkey(name),
          task_status:project_task_statuses!architect_tasks_status_id_fkey(name,is_completed)
        `)
          .lt("due_date", asOfDate)
          .limit(DEFAULT_LIMIT);

        if (error) throw error;

        const delayedTasks = (data || []).filter(
          (task: Record<string, unknown>) => {
            const status = String(task.status || "").toLowerCase();
            const statusObj = task.task_status as
              | { is_completed?: boolean }
              | null;
            if (statusObj?.is_completed) return false;
            return !["completed", "done"].includes(status);
          },
        );

        results.push({
          intent,
          tool: "get_delayed_projects_with_tasks",
          data: delayedTasks,
        });

        assistantMessage = summarizeDelayedProjects(
          delayedTasks as Array<Record<string, unknown>>,
          language,
        );
        await logEvent(
          "info",
          "Delayed projects tool finished",
          "ai.superbot.tool.finish",
          { count: delayedTasks.length },
        );
      }

      const untilDate = llmIntent?.until_date && llmIntent.until_date !== 'current_date'
        ? llmIntent.until_date
        : nowDate()

      const operation = await executeUpdateTasksUntilToday({
        supabase,
        projectIdentifier: llmIntent?.project_identifier || extractProjectIdentifier(message),
        untilDate,
        forceUpdate: forceUpdate || Boolean(llmIntent?.force_update),
        overridePhrase: overridePhrase || llmIntent?.override_phrase || '',
      })

      if (operation.outcome === 'project_required') {
        assistantMessage = copy.projectRequired
      } else if (operation.outcome === 'project_not_found') {
        assistantMessage = copy.projectNotFound(operation.projectIdentifier)
      } else if (operation.outcome === 'guardrail_blocked') {
        assistantMessage = copy.guardrailBlocked(operation.attemptedCount)
        await logEvent(
          'warning',
          'Bulk task update blocked by guardrail',
          'ai.superbot.guardrail.blocked',
          { project_id: operation.projectId, attempted_count: operation.attemptedCount },
          'high'
        )
      } else if (operation.outcome === 'no_pending_tasks') {
        assistantMessage = copy.noPendingTasks(operation.projectName, operation.untilDate)
      } else if (operation.outcome === 'updated') {
        results.push({
          intent,
          tool: 'update_project_tasks_until_today',
          data: {
            project_id: operation.projectId,
            project_name: operation.projectName,
            updated_count: operation.updatedCount,
            task_ids: operation.taskIds,
          },
        })

        assistantMessage = copy.tasksUpdated(operation.updatedCount, operation.projectName, operation.untilDate)

        await logEvent(
          'info',
          'Bulk task update executed',
          'ai.superbot.mutation',
          { project_id: operation.projectId, updated_count: operation.updatedCount, task_ids: operation.taskIds.slice(0, 20) },
          operation.updatedCount >= 20 ? 'high' : 'medium'
        )
      }

        await logEvent(
          "info",
          "Update tasks tool finished",
          "ai.superbot.tool.finish",
          {
            results_count: results.length,
          },
        );
      }

      if (intent === "quotes_without_vendor_proposal") {
        await logEvent(
          "info",
          "Executing quotes_without_vendor_proposal tool",
          "ai.superbot.tool.start",
          {
            tool: "get_quotes_without_vendor_proposal",
          },
        );

        const asOfDateISO =
          llmIntent?.as_of_date && llmIntent.as_of_date !== "current_date"
            ? new Date(llmIntent.as_of_date).toISOString()
            : new Date().toISOString();

        const { data, error } = await supabase
          .from("quote_requests")
          .select(`
          id,
          request_number,
          response_deadline,
          status,
          sent_at,
          suppliers(name),
          project_purchase_requests!quote_requests_purchase_request_id_fkey(id, project_id)
        `)
          .in("status", ["draft", "sent"])
          .lt("response_deadline", asOfDateISO)
          .limit(DEFAULT_LIMIT);

        if (error) throw error;

        results.push({
          intent,
          tool: "get_quotes_without_vendor_proposal",
          data: data || [],
        });

        assistantMessage = summarizeQuotes(
          (data || []) as Array<Record<string, unknown>>,
          language,
        );
        await logEvent(
          "info",
          "Quotes tool finished",
          "ai.superbot.tool.finish",
          { count: data?.length || 0 },
        );
      }

      if (intent === "unknown") {
        assistantMessage = copy.unknownIntent;
      }
    } catch (toolError) {
      toolErrorOccurred = true;
      const errorMessage = toolError instanceof Error
        ? toolError.message
        : String(toolError);

      await logEvent(
        "error",
        "Super Bot tool execution failed",
        "ai.superbot.tool.error",
        {
          intent,
          error: errorMessage,
        },
        "high",
      );

      results.push({
        intent,
        tool: "tool_execution_error",
        data: {
          error: errorMessage,
        },
      });

      await trackAnalyticsEvent({
        event_type: "request_error",
        role: userRole,
        intent,
        status: "error",
        duration_ms: Date.now() - startedAt,
        context: { error: errorMessage },
      });

      if (RETRYABLE_INTENTS.includes(intent)) {
        await enqueueRetryJob({
          role: userRole,
          intent,
          payload: {
            message,
            forceUpdate,
            overridePhrase,
            llm_intent: llmIntent || null,
          },
          last_error: errorMessage,
        });
      }

      assistantMessage = copy.operationFailed(errorMessage);
    }

    await supabase.from("ai_chat_messages").insert([
      {
        user_id: user.id,
        session_id: sessionId,
        role: "user",
        message,
      },
      {
        user_id: user.id,
        session_id: sessionId,
        role: "assistant",
        message: assistantMessage,
        function_calls: results,
      },
    ]);

    await logEvent(
      "info",
      "Super Bot request completed",
      "ai.superbot.response",
      {
        intent,
        duration_ms: Date.now() - startedAt,
        results_count: results.length,
        had_tool_error: toolErrorOccurred,
      },
      toolErrorOccurred ? "medium" : "low",
    );

    await trackAnalyticsEvent({
      event_type: "request_finish",
      role: userRole,
      intent,
      status: toolErrorOccurred ? "partial_success" : "success",
      duration_ms: Date.now() - startedAt,
      context: {
        results_count: results.length,
        had_tool_error: toolErrorOccurred,
      },
    });

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        results,
        traceId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Super Bot error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        traceId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

if (import.meta.main) {
  serve(handleRequest);
}
