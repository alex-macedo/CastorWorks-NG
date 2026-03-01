import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Answer validation schema
const answerSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().optional(),
  answerOptions: z.array(z.string()).optional(),
  answerNumber: z.number().optional(),
  answerDate: z.string().optional(),
  answerTime: z.string().optional(),
  answerFileUrls: z.array(z.string()).optional(),
  answerMatrix: z.record(z.any()).optional(),
});

// Request schema
const submitFormResponseSchema = z.object({
  formId: z.string().uuid().optional(),
  shareToken: z.string().optional(),
  answers: z.array(answerSchema),
  respondentEmail: z.string().email().optional(),
  honeypot: z.string().optional(), // Spam protection
}).refine(data => data.formId || data.shareToken, {
  message: "Either formId or shareToken must be provided",
});

interface ValidationError {
  questionId: string;
  field: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    // Honeypot check - if filled, it's a bot
    if (requestData.honeypot) {
      console.log('Honeypot triggered - potential spam');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validated = submitFormResponseSchema.parse(requestData);
    const { formId, shareToken, answers, respondentEmail } = validated;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Rate limiting: 10 submissions per minute per IP
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    const { count: recentSubmissions } = await supabase
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('respondent_ip', clientIP)
      .gte('created_at', oneMinuteAgo.toISOString());

    if ((recentSubmissions || 0) >= 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch form
    let query = supabase
      .from('forms')
      .select(`
        *,
        questions:form_questions(*)
      `);

    if (formId) {
      query = query.eq('id', formId);
    } else if (shareToken) {
      query = query.eq('share_token', shareToken);
    }

    const { data: form, error: formError } = await query.single();

    if (formError || !form) {
      return new Response(
        JSON.stringify({ success: false, error: 'Form not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate form is published and accepting responses
    if (form.status !== 'published') {
      return new Response(
        JSON.stringify({ success: false, error: 'This form is not accepting responses' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check deadline
    if (form.deadline && new Date(form.deadline) < now) {
      return new Response(
        JSON.stringify({ success: false, error: 'This form has passed its deadline' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check response limit
    if (form.response_limit) {
      const { count: totalResponses } = await supabase
        .from('form_responses')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', form.id)
        .eq('status', 'completed');

      if ((totalResponses || 0) >= form.response_limit) {
        return new Response(
          JSON.stringify({ success: false, error: 'This form has reached its response limit' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate answers against questions
    const validationErrors: ValidationError[] = [];
    const questions = (form.questions || []) as any[];

    for (const question of questions) {
      const answer = answers.find(a => a.questionId === question.id);

      // Check required fields
      if (question.required) {
        if (!answer || (!answer.answerText && 
                        !answer.answerOptions?.length && 
                        answer.answerNumber === undefined &&
                        !answer.answerDate &&
                        !answer.answerTime &&
                        !answer.answerFileUrls?.length &&
                        !answer.answerMatrix)) {
          validationErrors.push({
            questionId: question.id,
            field: 'required',
            message: `${question.title} is required`,
          });
        }
      }

      // Validate based on question type and validation rules
      if (answer && question.validation) {
        const validation = question.validation as any;

        // Text length validation
        if (answer.answerText && validation.minLength && answer.answerText.length < validation.minLength) {
          validationErrors.push({
            questionId: question.id,
            field: 'minLength',
            message: `Answer must be at least ${validation.minLength} characters`,
          });
        }

        if (answer.answerText && validation.maxLength && answer.answerText.length > validation.maxLength) {
          validationErrors.push({
            questionId: question.id,
            field: 'maxLength',
            message: `Answer must not exceed ${validation.maxLength} characters`,
          });
        }

        // Pattern validation
        if (answer.answerText && validation.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(answer.answerText)) {
            validationErrors.push({
              questionId: question.id,
              field: 'pattern',
              message: validation.patternMessage || 'Answer format is invalid',
            });
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ success: false, errors: validationErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user if available
    const authHeader = req.headers.get("Authorization");
    let respondentId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
      const { data: userData } = await anonClient.auth.getUser(token);
      respondentId = userData?.user?.id || null;
    }

    // Create response
    const { data: response, error: responseError } = await supabase
      .from('form_responses')
      .insert({
        form_id: form.id,
        respondent_id: respondentId,
        respondent_email: respondentEmail || null,
        respondent_ip: clientIP,
        status: 'completed',
        started_at: now.toISOString(),
        completed_at: now.toISOString(),
        user_agent: req.headers.get('user-agent') || null,
        referrer: req.headers.get('referer') || null,
      })
      .select()
      .single();

    if (responseError || !response) {
      console.error('Error creating response:', responseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert answers
    const answersToInsert = answers.map(answer => ({
      response_id: response.id,
      question_id: answer.questionId,
      answer_text: answer.answerText || null,
      answer_options: answer.answerOptions || [],
      answer_number: answer.answerNumber || null,
      answer_date: answer.answerDate || null,
      answer_time: answer.answerTime || null,
      answer_file_urls: answer.answerFileUrls || [],
      answer_matrix: answer.answerMatrix || null,
    }));

    const { error: answersError } = await supabase
      .from('form_response_answers')
      .insert(answersToInsert);

    if (answersError) {
      console.error('Error inserting answers:', answersError);
      // Rollback response
      await supabase.from('form_responses').delete().eq('id', response.id);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save answers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger webhooks asynchronously (don't wait)
    supabase.functions.invoke('process-form-webhook', {
      body: {
        formId: form.id,
        responseId: response.id,
        event: 'response.completed',
      },
    }).catch(err => console.error('Webhook trigger error:', err));

    // Return success with confirmation message
    const confirmationMessage = (form.settings as any)?.confirmationMessage || 
                                 'Thank you for your response!';

    return new Response(
      JSON.stringify({
        success: true,
        responseId: response.id,
        message: confirmationMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error submitting form response:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
