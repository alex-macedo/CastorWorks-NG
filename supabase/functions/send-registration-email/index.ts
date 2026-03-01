import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendRegistrationEmail } from "../_shared/sendRegistrationEmail.ts";

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { userEmail, userName }: { userEmail: string; userName?: string } = await req.json();

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'userEmail is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await sendRegistrationEmail({ userEmail, userName });

    return new Response(
      JSON.stringify({ success: true, message: 'Registration email sent successfully' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-registration-email function:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to send registration email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});