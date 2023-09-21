import { Trigger } from "deno-slack-api/types.ts";
import PrivateReportWorkflow from "../workflows/private_report_workflow.ts";

const trigger: Trigger<typeof PrivateReportWorkflow.definition> = {
  type: "shortcut",
  name: "triage",
  workflow: "#/workflows/private_report_workflow",
  inputs: {
    "user_id": {
      "value": "{{data.user_id}}",
    },
    "channel_id": {
      "value": "{{data.channel_id}}",
    },
  },
};

export default trigger;
