import { Trigger } from "deno-slack-api/types.ts";
import TriageByDaysWorkflow from "../workflows/triage_by_days_workflow.ts";

const trigger: Trigger<typeof TriageByDaysWorkflow.definition> = {
  type: "shortcut",
  name: "Triage by lookback days",
  workflow: "#/workflows/triage_by_days_workflow",
  inputs: {
    "user_id": {
      "value": "{{data.user_id}}",
    },
    "channel_id": {
      "value": "{{data.channel_id}}",
    },
    "interactivity_context": {
      "value": "{{data.interactivity}}",
    },
  },
};

export default trigger;
