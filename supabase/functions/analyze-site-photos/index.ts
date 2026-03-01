import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getAICompletion, VisionContent } from '../_shared/aiProviderClient.ts'
import { authenticateRequest, createServiceRoleClient, verifyProjectAccess } from '../_shared/authorization.ts'
import { getCachedInsight, cacheInsight } from '../_shared/aiCache.ts'

interface AnalyzeSitePhotosPayload {
  photoUrls: string[]
  projectId: string
  language: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR'
  forceRefresh?: boolean
}

async function hashPhotoUrls(photoUrls: string[]): Promise<string> {
  const input = [...photoUrls].sort().join('|')
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 50)
}

const prompts = {
  'pt-BR': `
    Você é um engenheiro de construção especialista. Analise as fotos do local da obra e forneça um relatório estruturado em JSON.
    As fotos são de um projeto em andamento. Sua tarefa é descrever o progresso, identificar materiais e atividades, estimar a porcentagem de conclusão da fase atual e fornecer observações.
    O JSON de saída DEVE seguir estritamente esta estrutura:
    {
      "progressSummary": "string",
      "weatherCondition": "sunny" | "cloudy" | "rainy" | "partly_cloudy",
      "identifiedMaterials": "string[]",
      "identifiedActivities": "string[]",
      "estimatedProgress": "number (0-100)",
      "observations": "string",
      "suggestedChecklist": "{ electrical: boolean, plumbing: boolean, structure: boolean, finishing: boolean }"
    }
  `,
  'en-US': `
    You are an expert construction engineer. Analyze the construction site photos and provide a structured JSON report.
    The photos are from a project in progress. Your task is to describe the progress, identify materials and activities, estimate the completion percentage of the current phase, and provide observations.
    The output JSON MUST strictly follow this structure:
    {
      "progressSummary": "string",
      "weatherCondition": "sunny" | "cloudy" | "rainy" | "partly_cloudy",
      "identifiedMaterials": "string[]",
      "identifiedActivities": "string[]",
      "estimatedProgress": "number (0-100)",
      "observations": "string",
      "suggestedChecklist": "{ electrical: boolean, plumbing: boolean, structure: boolean, finishing: boolean }"
    }
  `,
  'es-ES': `
    Eres un ingeniero de construcción experto. Analiza las fotos de la obra y proporciona un informe estructurado en JSON.
    Las fotos son de un proyecto en curso. Tu tarea es describir el progreso, identificar materiales y actividades, estimar el porcentaje de finalización de la fase actual y proporcionar observaciones.
    El JSON de salida DEBE seguir estrictamente esta estructura:
    {
      "progressSummary": "string",
      "weatherCondition": "sunny" | "cloudy" | "rainy" | "partly_cloudy",
      "identifiedMaterials": "string[]",
      "identifiedActivities": "string[]",
      "estimatedProgress": "number (0-100)",
      "observations": "string",
      "suggestedChecklist": "{ electrical: boolean, plumbing: boolean, structure: boolean, finishing: boolean }"
    }
  `,
  'fr-FR': `
    Vous êtes un ingénieur expert en construction. Analysez les photos du chantier et fournissez un rapport structuré au format JSON.
    Les photos proviennent d'un projet en cours. Votre tâche est de décrire l'avancement, d'identifier les matériaux et les activités, d'estimer le pourcentage d'achèvement de la phase actuelle et de fournir des observations.
    Le JSON de sortie DOIT suivre strictement cette structure :
    {
      "progressSummary": "string",
      "weatherCondition": "sunny" | "cloudy" | "rainy" | "partly_cloudy",
      "identifiedMaterials": "string[]",
      "identifiedActivities": "string[]",
      "estimatedProgress": "number (0-100)",
      "observations": "string",
      "suggestedChecklist": "{ electrical: boolean, plumbing: boolean, structure: boolean, finishing: boolean }"
    }
  `,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Authenticate request and return explicit 403 on auth failure
  let user
  try {
    user = await authenticateRequest(req)
    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }
  } catch (err) {
    console.error('authentication error', err)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    })
  }

  try {
    const { photoUrls, projectId, language, forceRefresh }: AnalyzeSitePhotosPayload =
      await req.json()

    try {
      await verifyProjectAccess(user.id, projectId)
    } catch (err) {
      console.error('authorization error', err)
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const supabase = createServiceRoleClient()
    const promptVersion = await hashPhotoUrls(photoUrls)

    if (!forceRefresh) {
      const cached = await getCachedInsight(
        supabase,
        'analyze-site-photos',
        'photos',
        projectId,
        user.id,
        { promptVersion }
      )
      if (cached) {
        console.log('✅ Returning cached site photo analysis for', projectId)
        return new Response(
          JSON.stringify({
            ...cached.content,
            cached: true,
            generatedAt: cached.generated_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }

    const visionContent: VisionContent = {
      type: 'vision',
      imageUrls: photoUrls,
      prompt: prompts[language] || prompts['en-US'],
      jsonOutput: true,
    }

    const { content } = await getAICompletion(visionContent)

    // Basic validation of the AI output
    const parsedResult = JSON.parse(content)
    if (!parsedResult.progressSummary || !parsedResult.estimatedProgress) {
      throw new Error('AI response is missing required fields.')
    }

    await cacheInsight(supabase, {
      insightType: 'analyze-site-photos',
      domain: 'photos',
      title: 'Site Photo Analysis',
      content: parsedResult,
      confidenceLevel: 85,
      projectId,
      userId: user.id,
      promptVersion,
      ttlHours: 6,
    })

    return new Response(
      JSON.stringify({
        ...parsedResult,
        cached: false,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})