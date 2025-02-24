import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

serve(async (req: Request) => {
  try {
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

    // Optional: Get recipe_id from query params
    const url = new URL(req.url)
    const recipeId = url.searchParams.get('recipe_id')

    // Build the query
    let query = supabaseClient
      .from('recipe_steps')
      .select('*')
      .in('status', ['ready_to_start', 'ready_to_finish'])
      .order('step_number', { ascending: true })
      .limit(1)

    // If recipe_id is provided, filter by it
    if (recipeId) {
      query = query.eq('recipe_id', recipeId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
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