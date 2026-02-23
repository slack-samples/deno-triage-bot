import { Trigger } from "@slack/api/types";
import PrivateReportWorkflow from "../workflows/private_report_workflow.ts";

const trigger: Trigger<typeof PrivateReportWorkflow.definition> = {
  type: "shortcut",
  name: "Triage",
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
