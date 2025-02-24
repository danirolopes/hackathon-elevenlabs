import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.24.7/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENROUTER_API_KEY"),
  baseURL: "https://openrouter.ai/api/v1"
});

// Inicializa o cliente Supabase
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_KEY")!
);

interface RecipeInput {
  name: string;
  ingredients: string[];
  steps: string[];
}

interface ImprovedStep {
  id: number;
  description: string;
  time_minutes: number;
  step_type: "active" | "partial" | "passive";
  depends_on: number[];
}

interface ScheduledStep extends ImprovedStep {
  predicted_start_time: number;
  predicted_end_time: number;
  step_number: number;
}

// Função de ordenação topológica e escalonamento
function topologicalSortAndSchedule(steps: ImprovedStep[], M: number): ScheduledStep[] {
  const stepMap = new Map<number, ImprovedStep>();
  const inDegrees = new Map<number, number>();
  const successors = new Map<number, number[]>();
  
  for (const step of steps) {
    stepMap.set(step.id, step);
    inDegrees.set(step.id, step.depends_on.length);
    successors.set(step.id, []);
  }
  for (const step of steps) {
    for (const dep of step.depends_on) {
      const succ = successors.get(dep) || [];
      succ.push(step.id);
      successors.set(dep, succ);
    }
  }
  
  const queue: number[] = [];
  for (const [id, deg] of inDegrees.entries()) {
    if (deg === 0) queue.push(id);
  }
  const topoOrder: number[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    topoOrder.push(current);
    for (const succ of successors.get(current) || []) {
      const newDeg = inDegrees.get(succ)! - 1;
      inDegrees.set(succ, newDeg);
      if (newDeg === 0) queue.push(succ);
    }
  }
  if (topoOrder.length !== steps.length) {
    throw new Error("Cycle detected in steps");
  }
  
  // Escalonamento: tempo em minutos, iniciando em 0.
  let activeAvail = 0;
  const partialSlots: number[] = Array(M).fill(0);
  const scheduled = new Map<number, { start: number; finish: number }>();
  
  for (const stepId of topoOrder) {
    const step = stepMap.get(stepId)!;
    let depTime = 0;
    for (const dep of step.depends_on) {
      const finish = scheduled.get(dep)?.finish || 0;
      if (finish > depTime) depTime = finish;
    }
    let startTime = depTime;
    if (step.step_type === "active") {
      startTime = Math.max(depTime, activeAvail);
      activeAvail = startTime + step.time_minutes;
    } else if (step.step_type === "partial") {
      partialSlots.sort((a, b) => a - b);
      const minSlot = partialSlots[0];
      startTime = Math.max(depTime, minSlot);
      partialSlots[0] = startTime + step.time_minutes;
    } else if (step.step_type === "passive") {
      startTime = depTime;
    }
    const finishTime = startTime + step.time_minutes;
    scheduled.set(step.id, { start: startTime, finish: finishTime });
  }
  
  const result: ScheduledStep[] = [];
  let stepNumber = 1;
  for (const stepId of topoOrder) {
    const step = stepMap.get(stepId)!;
    const { start, finish } = scheduled.get(stepId)!;
    result.push({
      ...step,
      predicted_start_time: start,
      predicted_end_time: finish,
      step_number: stepNumber++
    });
  }
  return result;
}

serve(async (req) => {
  try {
    // 1. Recebe o input da receita
    const { name, ingredients, steps }: RecipeInput = await req.json();
    if (!name || !ingredients || !steps) {
      return new Response(
        JSON.stringify({ error: "Nome da receita, ingredientes e passos são obrigatórios." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 2. Cria o prompt para melhoria dos passos
    const prompt = `We need to construct a DAG that represents the path needed to complete a recipe. An active step is a step that requires full attention of the cooker (ex: cutting). A partial step requires partial attention (ex: sauteeing). A passive step requires no attention (ex: baking). Most recipes come with not enough granular steps. You can and should make new steps to make the recipe more granular and easy to follow. Do not assume any preparations. If you need to use diced onions, create a step that dices the onions. Return format: A JSON array of Steps following this schema:
{ id: int, description: string, time_minutes: int, step_type: string ("active", "partial", "passive"), depends_on: int[] }
Name: ${name}
Ingredients: ${JSON.stringify(ingredients)}
Steps: ${JSON.stringify(steps)}`;
    
    // 3. Chama o LLM via OpenRouter para melhorar os passos da receita
    const completion = await openai.chat.completions.create({
      model: "anthropic/claude-3-sonnet-20240229",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides responses in JSON format. Your response should be only a JSON array of steps following the specified schema, with no additional text or explanation."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json" }
    });
    
    let improvedSteps: ImprovedStep[];
    try {
      improvedSteps = JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Failed to parse LLM response as JSON.", details: e.toString() }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 4. Ordena e escala os passos usando M = 2 para partial steps
    const scheduledSteps = topologicalSortAndSchedule(improvedSteps, 2);
    
    // 5. Gera um recipe_id (UUID) para essa receita
    const recipe_id = crypto.randomUUID();
    
    // 6. Prepara as linhas para inserção na tabela "recipe_steps".
    // Conforme o esquema, os campos obrigatórios são:
    // recipe_id, step_number, description, predicted_start_time, predicted_end_time, actual_start_time, actual_end_time, status
    // O primeiro step terá status "ready_to_start", os demais "unable_to_start".
    const rows = scheduledSteps.map((s, index) => ({
      recipe_id,
      step_number: s.step_number,
      description: s.description,
      predicted_start_time: s.predicted_start_time,
      predicted_end_time: s.predicted_end_time,
      actual_start_time: null,
      actual_end_time: null,
      status: index === 0 ? "ready_to_start" : "unable_to_start"
    }));
    
    // 7. Insere os passos agendados na tabela Supabase "recipe_steps"
    const { data, error } = await supabase.from("recipe_steps").insert(rows);
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 8. Retorna o recipe_id e os passos inseridos como resposta
    return new Response(
      JSON.stringify({ recipe_id, steps: data }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});