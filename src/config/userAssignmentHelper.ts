/**
 * User Assignment Helper
 *
 * Provides consistent pattern for assigning real users from auth.users
 * to team members, tasks, and other entities. This ensures that demo data
 * uses actual application users rather than hardcoded mock users.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SystemUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    [key: string]: any;
  };
}

/**
 * Fetch available users from auth.users via RPC
 *
 * This function retrieves actual system users that can be assigned to
 * various entities (team members, task owners, etc.) in the demo data.
 *
 * @param count - Optional: limit the number of users returned
 * @returns Promise<SystemUser[]> - Array of available users
 *
 * @example
 * ```typescript
 * const users = await getSystemUsersForAssignment(5);
 * const assignedUser = users[0];
 *
 * // Use in team assignment
 * const teamMember = {
 *   name: assignedUser.user_metadata?.full_name || assignedUser.email,
 *   user_id: assignedUser.id,
 *   email: assignedUser.email,
 * };
 * ```
 */
export async function getSystemUsersForAssignment(
  count?: number
): Promise<SystemUser[]> {
  try {
    // Call RPC function to get system users
    const { data: users, error } = await (supabase as any).rpc(
      'get_system_users'
    );

    if (error) {
      console.warn(`Could not fetch system users: ${error.message}`);
      return [];
    }

    if (!Array.isArray(users)) {
      console.warn('Unexpected response from get_system_users RPC');
      return [];
    }

    // Filter to valid user objects
    const validUsers = users.filter(
      (user: any) => user && typeof user === 'object' && user.id && user.email
    );

    // Return limited count if specified
    if (count && count > 0) {
      return validUsers.slice(0, count);
    }

    return validUsers;
  } catch (error) {
    console.error('Error fetching system users:', error);
    return [];
  }
}

/**
 * Get a single user with fallback to current user
 *
 * Attempts to fetch a system user. If no users available, falls back to
 * the currently authenticated user.
 *
 * @returns Promise<SystemUser | null> - A system user or null if none available
 *
 * @example
 * ```typescript
 * const user = await getSingleUserWithFallback();
 * if (user) {
 *   taskOwner = {
 *     user_id: user.id,
 *     assignee_name: user.user_metadata?.full_name || user.email,
 *   };
 * }
 * ```
 */
export async function getSingleUserWithFallback(): Promise<SystemUser | null> {
  // Try to get system users first
  const users = await getSystemUsersForAssignment(1);
  if (users.length > 0) {
    return users[0];
  }

  // Fallback to current authenticated user
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (currentUser) {
      return {
        id: currentUser.id,
        email: currentUser.email || '',
        user_metadata: currentUser.user_metadata,
      };
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }

  return null;
}

/**
 * Get random selection of users
 *
 * Returns a randomly selected subset of available users. Useful for
 * assigning varied team members to different projects.
 *
 * @param count - Number of users to select
 * @param excludeIds - Optional: user IDs to exclude from selection
 * @returns Promise<SystemUser[]> - Randomly selected users
 *
 * @example
 * ```typescript
 * const teamMembers = await getRandomUsers(3, [currentUserId]);
 * teamMembers.forEach((user, idx) => {
 *   rows.push({
 *     user_id: user.id,
 *     name: user.user_metadata?.full_name || user.email,
 *     role: roles[idx] || 'team_member',
 *   });
 * });
 * ```
 */
export async function getRandomUsers(
  count: number,
  excludeIds?: string[]
): Promise<SystemUser[]> {
  const users = await getSystemUsersForAssignment();

  // Filter out excluded users
  let filtered = users;
  if (excludeIds && excludeIds.length > 0) {
    const excludeSet = new Set(excludeIds);
    filtered = users.filter((u) => !excludeSet.has(u.id));
  }

  // Return all if fewer than requested
  if (filtered.length <= count) {
    return filtered;
  }

  // Randomly select from available users
  const selected: SystemUser[] = [];
  const availableIndices = Array.from({ length: filtered.length }, (_, i) => i);

  for (let i = 0; i < count && availableIndices.length > 0; i++) {
    const randomIdx = Math.floor(Math.random() * availableIndices.length);
    const selectedIdx = availableIndices[randomIdx];
    selected.push(filtered[selectedIdx]);

    // Remove selected index to avoid duplicates
    availableIndices.splice(randomIdx, 1);
  }

  return selected;
}

/**
 * Build team member object from user
 *
 * Converts a SystemUser to a team member object ready for database insertion.
 *
 * @param user - SystemUser object
 * @param projectId - Project ID to assign to
 * @param role - Team member role
 * @returns Object ready for database insertion
 *
 * @example
 * ```typescript
 * const user = await getSingleUserWithFallback();
 * if (user) {
 *   const teamMember = buildTeamMemberObject(user, projectId, 'manager');
 *   await supabase.from('project_team_members').insert(teamMember);
 * }
 * ```
 */
export function buildTeamMemberObject(
  user: SystemUser,
  projectId: string,
  role: string
): Record<string, any> {
  return {
    project_id: projectId,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
    user_id: user.id,
    email: user.email,
    role,
    created_at: new Date().toISOString(),
  };
}

/**
 * Build task assignment object from user
 *
 * Converts a SystemUser to a task assignment object ready for database insertion.
 *
 * @param user - SystemUser object
 * @param taskId - Task ID to assign to
 * @returns Object ready for database insertion
 *
 * @example
 * ```typescript
 * const user = await getRandomUsers(1)[0];
 * const assignment = buildTaskAssignmentObject(user, taskId);
 * await supabase.from('task_assignments').insert(assignment);
 * ```
 */
export function buildTaskAssignmentObject(
  user: SystemUser,
  taskId: string
): Record<string, any> {
  return {
    task_id: taskId,
    assigned_to: user.id,
    assigned_to_email: user.email,
    assigned_to_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    assigned_at: new Date().toISOString(),
  };
}
