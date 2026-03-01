import { supabase } from '@/integrations/supabase/client';

/**
 * Finds an existing client-accessible folder for a project
 * @param projectId - The project ID
 * @returns The folder ID if found, null otherwise
 */
export async function getClientFolderId(projectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('project_folders')
    .select('id')
    .eq('project_id', projectId)
    .or('folder_type.eq.client,client_accessible.eq.true')
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error finding client folder:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Finds or creates a client-accessible folder for storing reports
 * @param projectId - The project ID
 * @returns The folder ID
 */
export async function findOrCreateClientFolder(projectId: string): Promise<string> {
  // First, try to find an existing client folder
  const existingFolderId = await getClientFolderId(projectId);
  
  if (existingFolderId) {
    return existingFolderId;
  }

  // If no client folder exists, create one
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Try to get the folder name from translations, default to "Client Documents"
  const folderName = 'Client Documents'; // Will be localized in UI

  const { data, error } = await supabase
    .from('project_folders')
    .insert({
      project_id: projectId,
      folder_name: folderName,
      folder_type: 'client',
      client_accessible: true,
      description: 'Documents accessible to clients',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating client folder:', error);
    throw new Error(`Failed to create client folder: ${error.message}`);
  }

  return data.id;
}
