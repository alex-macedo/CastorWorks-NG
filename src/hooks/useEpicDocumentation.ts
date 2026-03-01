import { useState, useEffect } from "react";

interface EpicStory {
  number: string;
  title: string;
  userStory: string;
  acceptanceCriteria: string[];
  prerequisites: string;
  estimatedEffort?: string;
}

interface EpicDocumentation {
  epicNumber: number;
  title: string;
  expandedGoal: string;
  stories: EpicStory[];
  summary: {
    totalStories: number;
    estimatedEffort: string;
    valueDelivered: string;
  };
}

export function useEpicDocumentation(epicNumber: number) {
  const [documentation, setDocumentation] = useState<EpicDocumentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocumentation() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/docs/procurement-epics.md');
        if (!response.ok) {
          throw new Error('Failed to fetch epic documentation');
        }

        const content = await response.text();
        const parsed = parseEpicDocumentation(content, epicNumber);
        
        if (!parsed) {
          throw new Error(`Epic ${epicNumber} not found in documentation`);
        }

        setDocumentation(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocumentation();
  }, [epicNumber]);

  return { documentation, isLoading, error };
}

function parseEpicDocumentation(content: string, epicNumber: number): EpicDocumentation | null {
  // Handle Epic 0 (Prerequisite)
  if (epicNumber === 0) {
    const prerequisiteMatch = content.match(/## Prerequisite Stories([\s\S]*?)(?=## Epic 1)/);
    if (!prerequisiteMatch) return null;

    const section = prerequisiteMatch[1];
    const storyMatch = section.match(/\*\*Story 0\.1: (.+?)\*\*\s+(As .+?)\s+\*\*Acceptance Criteria:\*\*\s+([\s\S]*?)\s+\*\*Prerequisites:\*\*\s+(.+?)\s+(?:\*\*Security Context:[\s\S]*?)?\*\*Estimated Effort:\*\*\s+(.+?)$/m);
    
    if (!storyMatch) return null;

    return {
      epicNumber: 0,
      title: "Epic 0: RLS Policy Hardening & Validation",
      expandedGoal: "Comprehensive Row Level Security (RLS) validation across all procurement tables to ensure tenant data isolation and prevent cross-project data leaks. This is a security prerequisite that must be completed before Epic 1.",
      stories: [{
        number: "0.1",
        title: storyMatch[1],
        userStory: storyMatch[2].trim(),
        acceptanceCriteria: parseAcceptanceCriteria(storyMatch[3]),
        prerequisites: storyMatch[4].trim(),
        estimatedEffort: storyMatch[5].trim(),
      }],
      summary: {
        totalStories: 1,
        estimatedEffort: "2-3 hours",
        valueDelivered: "Security foundation for all procurement features with validated tenant isolation",
      },
    };
  }

  // Handle Epics 1-4
  const epicPattern = new RegExp(`## Epic ${epicNumber}:(.+?)\\s+### \\*\\*Expanded Goal\\*\\*\\s+(.+?)\\s+### \\*\\*Stories\\*\\*([\\s\\S]*?)### \\*\\*Epic ${epicNumber} Summary\\*\\*\\s+\\*\\*Total Stories:\\*\\* (\\d+)\\s+\\*\\*Estimated Effort:\\*\\* (.+?)\\s+\\*\\*Value Delivered:\\*\\* (.+?)\\s+---`, 'i');
  const epicMatch = content.match(epicPattern);

  if (!epicMatch) return null;

  const title = `Epic ${epicNumber}:${epicMatch[1].trim()}`;
  const expandedGoal = epicMatch[2].trim();
  const storiesSection = epicMatch[3];
  const totalStories = parseInt(epicMatch[4]);
  const estimatedEffort = epicMatch[5].trim();
  const valueDelivered = epicMatch[6].trim();

  // Parse individual stories
  const stories = parseStories(storiesSection, epicNumber);

  return {
    epicNumber,
    title,
    expandedGoal,
    stories,
    summary: {
      totalStories,
      estimatedEffort,
      valueDelivered,
    },
  };
}

function parseStories(storiesSection: string, epicNumber: number): EpicStory[] {
  const stories: EpicStory[] = [];
  const storyPattern = /\*\*Story (\d+\.\d+): (.+?)\*\*\s+(As .+?)\s+\*\*Acceptance Criteria:\*\*\s+([\s\S]*?)\s+\*\*Prerequisites:\*\*\s+(.+?)(?:\s+---|\s+###)/g;
  
  let match;
  while ((match = storyPattern.exec(storiesSection)) !== null) {
    stories.push({
      number: match[1],
      title: match[2].trim(),
      userStory: match[3].trim(),
      acceptanceCriteria: parseAcceptanceCriteria(match[4]),
      prerequisites: match[5].trim(),
    });
  }

  return stories;
}

function parseAcceptanceCriteria(criteriaText: string): string[] {
  const lines = criteriaText.split('\n')
    .map(line => line.trim())
    .filter(line => line.match(/^\d+\./));
  
  return lines.map(line => line.replace(/^\d+\.\s*/, '').trim());
}
