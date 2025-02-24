import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

interface CompleteRequestBody {
  request_id: string
  response: string
  status?: 'completed' | 'cancelled'
}

serve(async (req: Request) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Get request data from body
    const { request_id, response, status = 'completed' }: CompleteRequestBody = await req.json()

    // Validate required fields
    if (!request_id || !response) {
      throw new Error('request_id and response are required')
    }

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Complete the request
    const { data, error } = await supabaseClient
      .from('user_requests')
      .update({
        status,
        response,
        completed_at: new Date().toISOString()
      })
      .eq('id', request_id)
      .eq('status', 'pending') // Only update if still pending
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Request not found or already completed')
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 