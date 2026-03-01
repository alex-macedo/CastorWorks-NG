# AI Chat Assistant Edge Function

AI-powered chat assistant for the CastorWorks construction platform.

## Features

- Natural language conversation about projects and estimates
- Function calling for:
  - Creating estimates
  - Searching estimates
  - Getting business metrics
  - Retrieving project information
- Conversation history tracking
- Token usage logging

## Setup

### 1. Set Environment Variables

The function requires the Anthropic API key to be set as a secret:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 2. Deploy the Function

```bash
supabase functions deploy ai-chat-assistant
```

### 3. Verify Deployment

Test the function with:

```bash
curl -i --location --request POST 'https://<your-project-ref>.supabase.co/functions/v1/ai-chat-assistant' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Hello","sessionId":"test-123","context":{"currentPage":"/"}}'
```

## Model

Currently using: **claude-3-5-sonnet-20241022**

## Error Codes

- `MISSING_API_KEY` (503) - ANTHROPIC_API_KEY not configured
- `MISSING_PARAMS` (400) - Required parameters missing
- `Unauthorized` (401) - Invalid or missing authentication token

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"

Make sure you've set the secret:
```bash
supabase secrets list
# Should show ANTHROPIC_API_KEY

# If not present:
supabase secrets set ANTHROPIC_API_KEY=your_key_here
```

### "Edge Function returned a non-2xx status code"

Check the function logs:
```bash
supabase functions logs ai-chat-assistant
```

Common issues:
- API key not set or invalid
- User not authenticated
- Invalid request parameters
