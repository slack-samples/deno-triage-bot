import { Trigger } from "deno-slack-api/types.ts";
import PrivateReportWorkflow from "../workflows/private_report_workflow.ts";

const trigger: Trigger<typeof PrivateReportWorkflow.definition> = {
  type: "webhook",
  name: "triagebot private report",
  workflow: "#/workflows/private_report_workflow",
  inputs: {
    "channel_id": {
      "value": "{{data.channel_id}}",
    },
    "user_id": {
      "value": "{{data.user_id}}",
    },
    "lookback_days": {
      "value": "{{data.lookback_days}}",
    },
  },
};

export default trigger;
