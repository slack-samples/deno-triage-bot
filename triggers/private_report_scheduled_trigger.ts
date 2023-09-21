import { Trigger } from "deno-slack-api/types.ts";
import PostScheduledMessagesWorkflow from "../workflows/post_scheduled_messages_workflow.ts";

const trigger: Trigger<typeof PostScheduledMessagesWorkflow.definition> = {
  type: "scheduled",
  name: "Post Scheduled Messages",
  workflow: "#/workflows/post_scheduled_messages_workflow",
  schedule: {
    start_time: `2023-07-17T22:00:00Z`,
    timezone: "UTC",
    frequency: {
      type: "hourly",
      repeats_every: 1,
    },
  },
};

export default trigger;
