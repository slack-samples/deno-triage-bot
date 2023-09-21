import { Trigger } from "deno-slack-api/types.ts";
import PublicReportWorkflow from "../workflows/public_report_workflow.ts";

const trigger: Trigger<typeof PublicReportWorkflow.definition> = {
  type: "webhook",
  name: "triagebot public report",
  workflow: "#/workflows/public_report_workflow",
  inputs: {
    "channel_id": {
      "value": "{{data.channel_id}}",
    },
    "lookback_days": {
      "value": "{{data.lookback_days}}",
    },
    "scheduled": {
      "value": "{{data.scheduled}}",
    },
  },
};

export default trigger;
