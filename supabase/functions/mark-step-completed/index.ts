import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { step_id } = await req.json()

    if (!step_id) {
      throw new Error('step_id is required')
    }

    // Get the current step to find recipe_id and step_number
    const { data: currentStep, error: currentStepError } = await supabaseClient
      .from('recipe_steps')
      .select('*')
      .eq('id', step_id)
      .single()

    if (currentStepError) {
      throw currentStepError
    }

    // Mark current step as finished
    const { error: updateError } = await supabaseClient
      .from('recipe_steps')
      .update({ 
        status: 'finished',
        actual_end_time: new Date().toISOString()
      })
      .eq('id', step_id)

    if (updateError) {
      throw updateError
    }

    // Find and update the next step
    const { data: nextStep, error: nextStepError } = await supabaseClient
      .from('recipe_steps')
      .select('*')
      .eq('recipe_id', currentStep.recipe_id)
      .eq('step_number', currentStep.step_number + 1)
      .single()

    if (nextStep && !nextStepError) {
      const { error: nextStepUpdateError } = await supabaseClient
        .from('recipe_steps')
        .update({ status: 'ready_to_start' })
        .eq('id', nextStep.id)

      if (nextStepUpdateError) {
        throw nextStepUpdateError
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          completed_step: currentStep,
          next_step: nextStep 
        } 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 