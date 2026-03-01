import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, createServiceRoleClient, verifyAdminRole, verifyProjectAdminAccess } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleDriveFile {
  name: string;
  mimeType: string;
  content: string | Blob;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, projectId, files, folderId } = await req.json();

    const { user } = await authenticateRequest(req);
    const supabaseClient = createServiceRoleClient();

    if (projectId) {
      await verifyProjectAdminAccess(user.id, projectId, supabaseClient);
    } else {
      await verifyAdminRole(user.id, supabaseClient);
    }

    // Get Google Drive access token (would need OAuth setup)
    const GOOGLE_DRIVE_TOKEN = Deno.env.get('GOOGLE_DRIVE_ACCESS_TOKEN');
    
    if (!GOOGLE_DRIVE_TOKEN) {
      throw new Error('Google Drive integration not configured');
    }

    let result: any = {};

    switch (action) {
      case 'create-project-folder': {
        // Get project details
        const { data: project } = await supabaseClient
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();

        if (!project) throw new Error('Project not found');

        // Create main project folder
        const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GOOGLE_DRIVE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `Project: ${project.name}`,
            mimeType: 'application/vnd.google-apps.folder',
          }),
        });

        if (!folderResponse.ok) {
          throw new Error('Failed to create folder');
        }

        const folder = await folderResponse.json();

        // Create subfolders
        const subfolders = ['Documents', 'Photos', 'Reports', 'Materials'];
        for (const subfolder of subfolders) {
          await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GOOGLE_DRIVE_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: subfolder,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [folder.id],
            }),
          });
        }

        result = { folderId: folder.id, folderName: folder.name };
        break;
      }

      case 'upload-files': {
        if (!files || !folderId) {
          throw new Error('Files and folderId are required');
        }

        const uploadedFiles = [];
        
        for (const file of files as GoogleDriveFile[]) {
          // Create file metadata
          const metadata = {
            name: file.name,
            mimeType: file.mimeType,
            parents: [folderId],
          };

          // Upload file
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', file.content);

          const uploadResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${GOOGLE_DRIVE_TOKEN}`,
              },
              body: form,
            }
          );

          if (!uploadResponse.ok) {
            console.error(`Failed to upload ${file.name}`);
            continue;
          }

          const uploadedFile = await uploadResponse.json();
          uploadedFiles.push(uploadedFile);
        }

        result = { uploadedFiles, count: uploadedFiles.length };
        break;
      }

      case 'list-files': {
        if (!folderId) {
          throw new Error('folderId is required');
        }

        const listResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,createdTime,size)`,
          {
            headers: {
              'Authorization': `Bearer ${GOOGLE_DRIVE_TOKEN}`,
            },
          }
        );

        if (!listResponse.ok) {
          throw new Error('Failed to list files');
        }

        const fileList = await listResponse.json();
        result = fileList;
        break;
      }

      case 'sync-documents': {
        // Get project documents from Supabase storage
        const { data: files } = await supabaseClient.storage
          .from('project-images')
          .list(`${projectId}/`);

        if (!files) {
          result = { message: 'No files to sync', count: 0 };
          break;
        }

        // Upload each file to Google Drive
        const syncedFiles = [];
        for (const file of files) {
          // Download from Supabase
          const { data: fileData } = await supabaseClient.storage
            .from('project-images')
            .download(`${projectId}/${file.name}`);

          if (!fileData) continue;

          // Upload to Google Drive
          const metadata = {
            name: file.name,
            mimeType: file.metadata?.mimetype || 'application/octet-stream',
            parents: [folderId],
          };

          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', fileData);

          const uploadResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${GOOGLE_DRIVE_TOKEN}`,
              },
              body: form,
            }
          );

          if (uploadResponse.ok) {
            syncedFiles.push(file.name);
          }
        }

        result = { syncedFiles, count: syncedFiles.length };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-google-drive:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status =
      errorMessage === 'Unauthorized'
        ? 401
        : errorMessage.includes('Access denied') ||
          errorMessage.includes('Administrative access') ||
          errorMessage.includes('Administrator privileges')
        ? 403
        : 500;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
