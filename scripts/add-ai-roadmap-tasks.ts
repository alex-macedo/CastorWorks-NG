#!/usr/bin/env node

/**
 * Script to automatically add AI implementation plan tasks to the roadmap
 * This script parses the implementation plan and creates phases and tasks in the database
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TaskData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'small' | 'medium' | 'large' | 'xlarge';
  category: string;
  files: string[];
}

interface PhaseData {
  phaseNumber: number;
  phaseName: string;
  description: string;
  tasks: TaskData[];
}

// Parse the implementation plan text
function parseImplementationPlan(planText: string): PhaseData[] {
  const phases: PhaseData[] = [];
  const lines = planText.split('\n');

  let currentPhase: PhaseData | null = null;
  let currentTask: TaskData | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Phase header
    const phaseMatch = trimmed.match(/^PHASE (\d+): (.+)$/);
    if (phaseMatch) {
      if (currentPhase) {
        if (currentTask) {
          currentPhase.tasks.push(currentTask);
        }
        phases.push(currentPhase);
      }
      currentPhase = {
        phaseNumber: parseInt(phaseMatch[1]),
        phaseName: phaseMatch[2],
        description: '',
        tasks: []
      };
      currentTask = null;
      continue;
    }

    // Task header
    const taskMatch = trimmed.match(/^(\d+\.\d+)\s+(.+)$/);
    if (taskMatch && currentPhase) {
      if (currentTask) {
        currentPhase.tasks.push(currentTask);
      }
      currentTask = {
        title: taskMatch[2],
        description: '',
        priority: 'medium',
        effort: 'medium',
        category: 'feature',
        files: []
      };
      continue;
    }

    // Priority and Effort
    const priorityMatch = trimmed.match(/Priority:\s*(P\d+)\s*\|\s*Effort:\s*(\w+)/);
    if (priorityMatch && currentTask) {
      const priorityMap: { [key: string]: TaskData['priority'] } = {
        'P0': 'critical',
        'P1': 'high',
        'P2': 'medium',
        'P3': 'low'
      };
      const effortMap: { [key: string]: TaskData['effort'] } = {
        'S': 'small',
        'M': 'medium',
        'L': 'large',
        'XL': 'xlarge'
      };

      currentTask.priority = priorityMap[priorityMatch[1]] || 'medium';
      currentTask.effort = effortMap[priorityMatch[2]] || 'medium';
      continue;
    }

    // Files section
    if (trimmed === 'Files to modify:' || trimmed === 'Files to create/modify:' || trimmed === 'Files:') {
      continue;
    }

    // File entries
    if (trimmed.startsWith('New:') || trimmed.startsWith('src/') || trimmed.startsWith('supabase/') || trimmed.startsWith('New file:') || trimmed.startsWith('Modify:')) {
      if (currentTask) {
        const file = trimmed.replace(/^(New:|Modify:)\s*/, '');
        currentTask.files.push(file);
      }
      continue;
    }

    // Description text (if not empty and not a file)
    if (trimmed && currentTask && !trimmed.startsWith('src/') && !trimmed.startsWith('supabase/') && !trimmed.includes('—') && trimmed.length > 10) {
      if (currentTask.description) {
        currentTask.description += ' ' + trimmed;
      } else {
        currentTask.description = trimmed;
      }
    }
  }

  // Add the last phase and task
  if (currentPhase) {
    if (currentTask) {
      currentPhase.tasks.push(currentTask);
    }
    phases.push(currentPhase);
  }

  return phases;
}

async function insertPhasesAndTasks(phases: PhaseData[]) {
  console.log('Starting to insert phases and tasks...');

  for (const phase of phases) {
    console.log(`\nProcessing Phase ${phase.phaseNumber}: ${phase.phaseName}`);

    // Check if phase already exists
    const { data: existingPhase } = await supabase
      .from('office_phases')
      .select('id')
      .eq('phase_number', phase.phaseNumber)
      .single();

    let phaseId: string;
    if (existingPhase) {
      console.log(`✓ Phase already exists: ${phase.phaseName}`);
      phaseId = existingPhase.id;
    } else {
      // Insert phase
      const { data: phaseData, error: phaseError } = await supabase
        .from('office_phases')
        .insert({
          phase_number: phase.phaseNumber,
          phase_name: phase.phaseName,
          description: phase.description || `${phase.phaseName} implementation`,
          status: 'planning'
        })
        .select()
        .single();

      if (phaseError) {
        console.error(`Error inserting phase ${phase.phaseNumber}:`, phaseError);
        continue;
      }

      console.log(`✓ Created phase: ${phaseData.phase_name}`);
      phaseId = phaseData.id;
    }

    // Insert tasks
    for (const task of phase.tasks) {
      // Check if task already exists
      const { data: existingTask } = await supabase
        .from('office_tasks')
        .select('id')
        .eq('phase_id', phaseId)
        .eq('title', task.title)
        .single();

      if (existingTask) {
        console.log(`  ✓ Task already exists: ${task.title}`);
        continue;
      }

      const taskDescription = task.description || task.title;
      const filesText = task.files.length > 0 ? `\n\nFiles: ${task.files.join(', ')}` : '';

      const { data: taskData, error: taskError } = await supabase
        .from('office_tasks')
        .insert({
          phase_id: phaseId,
          title: task.title,
          description: taskDescription + filesText,
          category: task.category,
          status: 'not_started',
          priority: task.priority,
          estimated_hours: task.effort === 'small' ? 8 : task.effort === 'medium' ? 20 : task.effort === 'large' ? 40 : 80
        })
        .select()
        .single();

      if (taskError) {
        console.error(`Error inserting task "${task.title}":`, taskError);
      } else {
        console.log(`  ✓ Created task: ${taskData.title} (${task.priority} priority, ${task.effort} effort)`);
      }
    }
  }

  console.log('\n✅ All phases and tasks processed successfully!');
}

async function main() {
  // The implementation plan text from the user
  const implementationPlan = `Implementation Plan
PHASE 1: AI-First Foundation (Surface Existing AI + Critical Missing Features)
1.1 AI Project Assistant — Architect Context-Aware Chat
Priority: P0 | Effort: M
Extend the existing ai-chat-assistant edge function with architect-specific tools so it understands the full project context (briefing, moodboard, tasks, meetings, diary, financials). Build a floating chat panel for Architect pages.
No competitor has a general-purpose project intelligence assistant. Vobi's "Financial AI Agent" is limited to finances.
Files to modify:

supabase/functions/ai-chat-assistant/index.ts — Add tools: get_briefing_data, get_moodboard_summary, get_meeting_history, get_site_diary_entries, get_task_summary, get_financial_overview
New: src/components/Architect/AIAssistant/ArchitectAIChat.tsx — Floating chat panel (Sheet component)
New: src/components/Architect/AIAssistant/ArchitectAIChatTrigger.tsx — FAB button
New: src/hooks/useArchitectAIChat.ts — Extends useChatAssistant with project context injection
src/locales/{all-4}/architect.json — AI assistant strings

1.2 AI Meeting Summarizer
Priority: P0 | Effort: S
From meeting notes or voice recording, generate structured summary + action items that convert to tasks with one click. Uses existing transcribe-voice-input function for audio.
Files to modify:

New: supabase/functions/summarize-meeting/index.ts — Structured summary + action item extraction
New: src/components/Architect/Meetings/MeetingSummarizer.tsx — UI trigger within meeting detail
New: src/components/Architect/Meetings/ActionItemsList.tsx — Action items with "Create Task" buttons
src/components/Architect/Meetings/MeetingFormDialog.tsx — Add "AI Summarize" button
src/hooks/useArchitectMeetings.tsx — Add summarizeMeeting mutation

1.3 Time Tracking with Timer
Priority: P0 | Effort: M
Industry-standard feature (MonsiERP's core). Start/stop timer, manual entry, weekly timesheets, per-project/per-task tracking. AI analyzes time data for insights.
Files to create:

New: supabase/migrations/YYYYMMDD_create_time_entries.sql — time_entries table with RLS
New: src/hooks/useTimeTracking.ts — CRUD + timer state management
New: src/components/Architect/TimeTracking/TimeTracker.tsx — Floating timer widget
New: src/components/Architect/TimeTracking/TimeEntryList.tsx — Daily/weekly view
New: src/components/Architect/TimeTracking/TimeReportCard.tsx — Dashboard summary card
New: src/pages/architect/ArchitectTimeTrackingPage.tsx — Dedicated timesheet page
src/App.tsx — Add /architect/time-tracking route

1.4 AI Briefing Generator
Priority: P1 | Effort: S
From conversation transcript, voice recording, or freeform notes, auto-generate structured briefing matching the BriefingForm schema. Reduces 1-2 hour manual translation to minutes.
Files to modify:

New: supabase/functions/generate-briefing/index.ts — Text/voice to structured briefing
New: src/components/Architect/Briefing/AIBriefingGenerator.tsx — Dialog within BriefingForm
src/components/Architect/Briefing/BriefingForm.tsx — Add "Generate from Notes" button
src/hooks/useArchitectBriefings.tsx — Add generateBriefing method

1.5 AI Site Diary Reporter
Priority: P1 | Effort: S
From uploaded site photos, auto-generate diary entries using existing image analysis (aiClient.analyzeImage). Detects weather, materials, progress.
Files to modify:

New: supabase/functions/analyze-site-photos/index.ts — Photo array analysis
New: src/components/Architect/SiteDiary/AISiteDiaryGenerator.tsx — Photo upload + generate
src/components/Architect/SiteDiary/SiteDiaryFormDialog.tsx — Integrate AI button
src/hooks/useArchitectSiteDiary.tsx — Add generateFromPhotos method


PHASE 2: Financial Intelligence & Budget Tools
2.1 AI Financial Advisor
Priority: P0 | Effort: L
Comprehensive AI financial advisor using existing BudgetIntelligenceAnalysis types (variance predictions, anomaly detection, spending patterns, optimization). Surfaces through dedicated UI. Directly competes with Vobi's Financial AI Agent but more sophisticated.
Files to create/modify:

New: supabase/functions/architect-financial-advisor/index.ts
New: src/components/Architect/Financial/FinancialAdvisorPanel.tsx — Alerts, Predictions, Recommendations tabs
New: src/components/Architect/Financial/BudgetHealthCard.tsx — Dashboard health score
New: src/hooks/useArchitectFinancialAdvisor.ts
New: src/pages/architect/ArchitectFinancialPage.tsx
src/App.tsx — Add /architect/financial route

2.2 AI Proposal/Budget Generator
Priority: P0 | Effort: M
Extend existing generate-proposal-content edge function with architect-specific sections (design philosophy, methodology, fee structure). Connect to Architect workflow with briefing integration.
Files to create/modify:

New: src/pages/architect/ArchitectProposalBuilderPage.tsx — Wraps existing ProposalBuilder
supabase/functions/generate-proposal-content/index.ts — Add architect sections
New: src/components/Architect/Proposals/ArchitectProposalPreview.tsx
New: src/hooks/useArchitectProposals.ts
src/App.tsx — Add /architect/proposals route

2.3 Enhanced Site Diary with Real-Time Sharing
Priority: P1 | Effort: M
Upgrade diary with Supabase Realtime subscriptions, photo annotations, timeline view, and client portal visibility. AI generates daily progress summaries.
Files to create/modify:

New: src/components/Architect/SiteDiary/SiteDiaryTimeline.tsx
New: src/components/Architect/SiteDiary/SiteDiaryRealtimeSync.tsx
New: src/components/ClientPortal/SiteDiary/ClientSiteDiaryView.tsx
src/hooks/useArchitectSiteDiary.tsx — Add realtime subscription


PHASE 3: Communication & Client Engagement
3.1 WhatsApp Integration for Architect Portal
Priority: P1 | Effort: M
Surface existing WhatsApp backend (Twilio send + webhook) in Architect Portal UI. Send project updates, milestone notifications, payment reminders. AI drafts contextual messages.
Files to create:

New: src/components/Architect/Communication/WhatsAppPanel.tsx
New: src/components/Architect/Communication/WhatsAppTemplateSelector.tsx
New: src/components/Architect/Communication/AIDraftMessage.tsx
New: src/hooks/useArchitectWhatsApp.ts

3.2 AI Client Communication Drafts
Priority: P1 | Effort: S
Generate professional client update drafts (email, WhatsApp, portal) from project state. Extends existing communication-assistant insight type.
Files to create:

New: supabase/functions/generate-client-communication/index.ts
New: src/components/Architect/Communication/AICommunicationDrafter.tsx
New: src/hooks/useAICommunication.ts

3.3 AI Task Prioritization
Priority: P2 | Effort: S
Smart task ordering across all projects based on deadlines, dependencies, workload, and project phase.
Files to create:

New: supabase/functions/prioritize-tasks/index.ts
New: src/components/Architect/Tasks/AITaskPrioritizer.tsx
src/hooks/useArchitectTasks.tsx — Add getAIPrioritization


PHASE 4: Advanced Differentiators
4.1 AI Moodboard Suggestions
Priority: P2 | Effort: M
Analyze moodboard images + briefing preferences to suggest complementary colors, materials, and design elements. No competitor offers this.
Files: New edge function + suggestion panel component + moodboard integration
4.2 AI Portfolio Content Generator
Priority: P2 | Effort: S
Transform project data (briefing, diary, financials) into polished portfolio descriptions and case studies.
Files: New edge function + portfolio generator component
4.3 Work Measurement / Progress Tracking
Priority: P2 | Effort: L
Quantitative progress per phase with AI completion date predictions. Competes with Vobi's work measurement.
Files: New DB table + hooks + measurement panel + progress dashboard
4.4 Material/Product Catalog
Priority: P3 | Effort: XL
Material library with SINAPI integration (existing useSinapiLookup hook). AI suggests alternatives based on budget/sustainability.
Files: New DB tables + catalog UI + AI suggestion component`;

  const phases = parseImplementationPlan(implementationPlan);
  console.log(`Parsed ${phases.length} phases with ${phases.reduce((sum, p) => sum + p.tasks.length, 0)} tasks`);

  await insertPhasesAndTasks(phases);
}

main().catch(console.error);