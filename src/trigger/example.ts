import { logger, task, wait } from "@trigger.dev/sdk/v3";

interface WaitMinutesPayload {
  minutes: number;
}

interface StepTimingPayload {
  step_id: string;
  predicted_duration_minutes: number;
}

export const waitMinutesTask = task({
  id: "wait-minutes",
  maxDuration: 300, // 1 hour max duration
  run: async (payload: WaitMinutesPayload, { ctx }) => {
    const seconds = payload.minutes * 60;
    logger.log(`Starting to wait for ${payload.minutes} minutes (${seconds} seconds)`);

    await wait.for({ seconds });

    return {
      message: `Finished waiting for ${payload.minutes} minutes`,
    };
  },
});

export const handleStepTimingTask = task({
  id: "handle-step-timing",
  maxDuration: 300, // 1 hour max duration
  run: async (payload: StepTimingPayload, { ctx }) => {
    const { step_id, predicted_duration_minutes } = payload;
    logger.log(`Starting timer for step ${step_id} for ${predicted_duration_minutes} minutes`);

    await wait.for({ seconds: predicted_duration_minutes * 60 / 10 });

    // Call the Supabase function to mark the step as ready to complete
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/mark-step-ready-to-complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ step_id })
    });

    if (!response.ok) {
      throw new Error(`Failed to mark step ${step_id} as ready to complete`);
    }

    return {
      message: `Step ${step_id} is now ready to complete`,
      step_id
    };
  },
});