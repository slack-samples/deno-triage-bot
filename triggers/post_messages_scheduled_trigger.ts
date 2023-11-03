import { Trigger } from "deno-slack-api/types.ts";
import PostScheduledMessagesWorkflow from "../workflows/post_scheduled_messages_workflow.ts";

const futureTime = new Date();
futureTime.setHours(futureTime.getHours() + 1);
futureTime.setMinutes(0);

const trigger: Trigger<typeof PostScheduledMessagesWorkflow.definition> = {
  type: "scheduled",
  name: "Post Scheduled Messages",
  workflow: "#/workflows/post_scheduled_messages_workflow",
  schedule: {
    //  Schedule the first execution the next hour after the trigger is created
    start_time: futureTime.toISOString(),
    timezone: "UTC",
    frequency: {
      type: "hourly",
      repeats_every: 1,
    },
  },
};

export default trigger;
