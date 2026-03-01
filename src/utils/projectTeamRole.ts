const PROJECT_TEAM_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  project_manager: 'Project Manager',
  manager: 'Manager',
  owner: 'Owner',
  client: 'Client',
  site_supervisor: 'Site Supervisor',
  supervisor: 'Supervisor',
  viewer: 'Viewer',
  accountant: 'Accountant',
};

export function getProjectTeamRoleLabel(role?: string | null) {
  if (!role) return 'Team Member';

  const normalized = role.toLowerCase().replace(/[\s_]+/g, '_');
  return PROJECT_TEAM_ROLE_LABELS[normalized] ?? role;
}
