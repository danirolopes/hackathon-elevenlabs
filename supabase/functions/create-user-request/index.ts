import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

interface CreateRequestBody {
  recipe_id: string
  step_id?: string
  request_type: string
  request_message: string
}

serve(async (req: Request) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Get request data from body
    const { recipe_id, step_id, request_type, request_message }: CreateRequestBody = await req.json()

    // Validate required fields
    if (!recipe_id || !request_type || !request_message) {
      throw new Error('recipe_id, request_type, and request_message are required')
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

    // Create the request
    const { data, error } = await supabaseClient
      .from('user_requests')
      .insert({
        recipe_id,
        step_id,
        request_type,
        request_message,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      throw error
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