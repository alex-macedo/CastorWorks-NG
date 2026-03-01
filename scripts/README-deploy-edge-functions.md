# Edge Functions Deployment Script

## Overview

The `deploy-edge-functions.sh` script automates the deployment of all Supabase Edge Functions from the `supabase/functions/` directory to your local Supabase instance running in Docker.

## How It Works

This script:
1. Reads all function directories from `supabase/functions/` (excluding `_shared`)
2. Copies each function to the Docker volume mounted by the `supabase-edge-functions` container
3. Copies the `_shared` directory (used by many functions for common utilities)
4. Restarts the edge functions container to pick up the changes
5. Provides detailed progress and summary output

## Prerequisites

- Supabase must be running in Docker (use `./castorworks.sh start`)
- The script must be run with appropriate permissions (as root or with sudo)
- The target directory `/root/supabase-CastorWorks/volumes/functions` must exist

## Usage

### Basic Usage

```bash
./scripts/deploy-edge-functions.sh
```

### Expected Output

The script will display:
- Total number of functions found
- List of all functions to be deployed
- Progress for each function deployment
- Summary showing success/failure counts
- Example curl command to test a deployed function

### Example Output

```
╔════════════════════════════════════════════════╗
║  Deploying Supabase Edge Functions            ║
╚════════════════════════════════════════════════╝

   Source: supabase/functions
   Target: /root/supabase-CastorWorks/volumes/functions

Found 42 function(s) to deploy:
  • acknowledge-purchase-order
  • ai-cache-manager
  ...

📦 Copying shared utilities...
✅ Copied _shared directory

📦 Deploying: acknowledge-purchase-order
   ✅ Successfully deployed

...

════════════════════════════════════════════════
Deployment Summary
════════════════════════════════════════════════
   Total functions: 42
   Successfully deployed: 42

🔄 Restarting edge functions container...
✅ Container restarted successfully

🎉 All edge functions deployed successfully!
```

## Function Structure

Each edge function must have the following structure:

```
supabase/functions/
├── _shared/                    # Shared utilities (optional)
│   ├── authorization.ts
│   ├── errorHandler.ts
│   └── ...
└── function-name/              # Individual function
    ├── index.ts                # Required entry point
    └── deno.json              # Optional Deno config
```

## Accessing Deployed Functions

After deployment, functions are available at:

```
http://localhost:54321/functions/v1/<function-name>
```

### Example Request

```bash
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/ai-chat-assistant' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Hello"}'
```

## Getting Your Anon Key

You can find your anon key in:
- The Supabase Studio: http://localhost:54323
- Or in your `.env` file as `VITE_SUPABASE_ANON_KEY`

## Troubleshooting

### Container Not Running

If you see a warning that the container is not running:
```bash
./castorworks.sh start
```

### Permission Denied

If you get permission errors, run the script with sudo:
```bash
sudo ./scripts/deploy-edge-functions.sh
```

### Target Directory Not Found

Ensure Supabase is properly initialized and running:
```bash
./castorworks.sh status
```

### Function Not Working After Deployment

1. Check the container logs:
   ```bash
   docker logs supabase-edge-functions
   ```

2. Verify the function was copied correctly:
   ```bash
   ls -la /root/supabase-CastorWorks/volumes/functions/
   ```

3. Restart the container manually:
   ```bash
   docker restart supabase-edge-functions
   ```

## Development Workflow

### Adding a New Function

1. Create a new directory in `supabase/functions/`:
   ```bash
   mkdir supabase/functions/my-new-function
   ```

2. Create the `index.ts` file:
   ```typescript
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

   serve(async (req: Request) => {
     return new Response(
       JSON.stringify({ message: 'Hello from my-new-function!' }),
       { headers: { 'Content-Type': 'application/json' } }
     );
   });
   ```

3. Deploy all functions:
   ```bash
   ./scripts/deploy-edge-functions.sh
   ```

### Updating an Existing Function

1. Make your changes to the function in `supabase/functions/`
2. Redeploy all functions:
   ```bash
   ./scripts/deploy-edge-functions.sh
   ```

## Technical Details

### Docker Volume Mount

The script copies functions to `/root/supabase-CastorWorks/volumes/functions`, which is mounted to `/home/deno/functions` inside the `supabase-edge-functions` container.

### File Permissions

The script sets permissions to `755` on all deployed functions to ensure they're readable and executable by the Deno runtime.

### Shared Utilities

The `_shared` directory contains common utilities used by multiple functions:
- `authorization.ts` - Authentication and authorization helpers
- `errorHandler.ts` - Error handling utilities
- `rateLimiter.ts` - Rate limiting functionality
- `aiCache.ts` - AI response caching
- And more...

## Related Scripts

- `scripts/migrate.sh` - Run database migrations
- `scripts/deploy-functions.sh` - Deploy SQL functions (different from edge functions)
- `./castorworks.sh` - Main application control script

## Exit Codes

- `0` - Success
- `1` - Error (check output for details)

## Notes

- The script uses colored output for better readability
- All 42 edge functions are deployed in a single run
- The container is automatically restarted after deployment
- Existing functions are replaced (not merged) on each deployment
