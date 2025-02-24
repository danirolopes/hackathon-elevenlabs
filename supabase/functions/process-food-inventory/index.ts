// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// @deno-types="https://deno.land/std@0.177.0/http/server.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { OpenAI } from "https://deno.land/x/openai@v4.24.7/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// CORS headers for the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IdentifiedItem {
  quantity: number;
  name: string;
}

interface ProcessedInventory {
  identified_items: IdentifiedItem[];
}

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
});

async function processImage(base64Image: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "List ONLY visible food items. Format: \"Nx Item\".\n" +
                  "If uncertain about quantity, use 1x. One item per line.\n" +
                  "Example:\n2x Milk\n3x Apples"
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1024,
      temperature: 0.25
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new Error("Failed to process image with OpenAI");
  }
}

function parseResponse(responseText: string): IdentifiedItem[] {
  const items: IdentifiedItem[] = [];
  const aggregatedItems: { [key: string]: number } = {};
  const originalNames: { [key: string]: string } = {};

  // Process each line
  responseText.split('\n').forEach(line => {
    line = line.trim();
    if (!line) return;

    // Extract quantity and name with regex
    const match = line.match(/(\d+)x\s+(.+)/i);
    if (!match) {
      console.warn(`Skipping malformed line: ${line}`);
      return;
    }

    const quantity = parseInt(match[1]);
    const originalName = match[2].trim();
    const normalizedName = originalName.toLowerCase();

    // Track original capitalization
    if (!originalNames[normalizedName]) {
      originalNames[normalizedName] = originalName;
    }

    // Aggregate quantities
    aggregatedItems[normalizedName] = (aggregatedItems[normalizedName] || 0) + quantity;
  });

  // Convert aggregated items to final format
  for (const [normalizedName, quantity] of Object.entries(aggregatedItems)) {
    items.push({
      quantity,
      name: originalNames[normalizedName]
    });
  }

  return items;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify method
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the image data from request body
    const { image } = await req.json();
    
    if (!image) {
      throw new Error('Image data is required');
    }

    // Process the image
    const responseText = await processImage(image);
    
    // Parse the response
    const identifiedItems = parseResponse(responseText);

    // Insert items into missing_ingredients table
    const { data, error } = await supabaseClient
      .from('pantry_ingredients')
      .insert(
        identifiedItems.map(item => ({
          ingredient_name: item.name,
        }))
      )
      .select();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while processing the inventory'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-food-inventory' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
