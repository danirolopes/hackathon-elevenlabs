import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

// Use the full model identifier with the feature extraction task specified.
const API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2?task=feature-extraction";

// Load the HuggingFace API key from environment variables
const HF_API_KEY = Deno.env.get("HF_API_KEY");

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    // Expect the request JSON to contain a "query_text" field.
    const { query_text } = await req.json();
    if (!query_text) {
      return new Response(
        JSON.stringify({ error: "Missing query_text in request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call the HuggingFace Inference API with the input as a raw string.
    const hfResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({ inputs: [query_text], options: { wait_for_model: true } }),
    });

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      return new Response(
        JSON.stringify({ error: errorText }),
        { status: hfResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse the embedding data.
    // When passing a string for feature extraction, the response is typically an array of numbers.
    const embeddingData = await hfResponse.json();

    // Return the embedding vector.
    return new Response(
      JSON.stringify({ embedding: embeddingData }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.toString() }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});