import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const whisperUrl = Deno.env.get('WHISPER_CPP_URL') || 'http://localhost:8000'

const supabase = createClient(supabaseUrl, supabaseKey)

interface TranscribeRequest {
  daily_log_id: string
  project_id: string
  audio_url: string
}

async function downloadAudioFromStorage(audioUrl: string): Promise<ArrayBuffer> {
  // audioUrl format: /project-documents/{projectId}/daily-logs/{date}/audio-{uuid}.webm
  const urlParts = audioUrl.split('/')
  const bucket = urlParts[1] || 'project-documents'
  const path = urlParts.slice(2).join('/')

  const { data, error } = await supabase.storage.from(bucket).download(path)

  if (error) {
    throw new Error(`Failed to download audio: ${error.message}`)
  }

  return data.arrayBuffer()
}

async function transcribeWithWhisperCpp(audioBuffer: ArrayBuffer): Promise<string> {
  // Create FormData with audio file
  const formData = new FormData()
  const blob = new Blob([audioBuffer], { type: 'audio/webm' })
  formData.append('file', blob, 'audio.webm')

  try {
    const response = await fetch(`${whisperUrl}/inference`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - fetch will do it with boundary
      },
    })

    if (!response.ok) {
      throw new Error(`Whisper.cpp returned ${response.status}`)
    }

    const result = await response.json()

    // Whisper.cpp returns: { result: { transcription: "text" } }
    if (result.result?.transcription) {
      return result.result.transcription
    }

    throw new Error('Invalid response format from Whisper.cpp')
  } catch (error) {
    throw new Error(`Whisper.cpp transcription failed: ${error.message}`)
  }
}

async function updateTranscriptionStatus(
  dailyLogId: string,
  status: 'processing' | 'completed' | 'failed',
  data: {
    transcript?: string
    error?: string
    completed_at?: string
  }
) {
  const updateData: any = {
    transcription_status: status,
    transcription_completed_at: new Date().toISOString(),
  }

  if (data.transcript) updateData.transcript = data.transcript
  if (data.error) updateData.transcription_error = data.error
  if (status === 'processing') {
    updateData.transcription_started_at = new Date().toISOString()
    delete updateData.transcription_completed_at
  }

  const { error } = await supabase
    .from('daily_logs')
    .update(updateData)
    .eq('id', dailyLogId)

  if (error) {
    console.error('Failed to update transcription status:', error)
    throw error
  }
}

serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload: TranscribeRequest = await req.json()
    const { daily_log_id, project_id: _project_id, audio_url } = payload

    // Validate input
    if (!daily_log_id || !audio_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: daily_log_id, audio_url' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting transcription for daily_log_id: ${daily_log_id}`)

    // Mark as processing
    await updateTranscriptionStatus(daily_log_id, 'processing', {})

    // Download audio from storage
    console.log('Downloading audio from storage...')
    const audioBuffer = await downloadAudioFromStorage(audio_url)
    console.log(`Audio downloaded: ${audioBuffer.byteLength} bytes`)

    // Transcribe with Whisper.cpp
    console.log('Sending to Whisper.cpp for transcription...')
    const transcript = await transcribeWithWhisperCpp(audioBuffer)
    console.log(`Transcription complete: ${transcript.length} characters`)

    // Update database with transcript
    await updateTranscriptionStatus(daily_log_id, 'completed', {
      transcript,
    })

    console.log('Transcription saved to database')

    return new Response(
      JSON.stringify({
        success: true,
        daily_log_id,
        transcript_length: transcript.length,
        message: 'Transcription completed successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Transcription error:', error)

    try {
      const payload = await req.json()
      await updateTranscriptionStatus(payload.daily_log_id, 'failed', {
        error: error.message,
      })
    } catch {
      // If we can't update DB, just log the error
      console.error('Failed to update error status in database')
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
