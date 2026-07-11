import { Trigger } from "@slack/api/types";
import PublicReportWorkflow from "../workflows/public_report_workflow.ts";

const trigger: Trigger<typeof PublicReportWorkflow.definition> = {
  type: "shortcut",
  name: "Triage Publish",
  workflow: "#/workflows/public_report_workflow",
  inputs: {
    "channel_id": {
      "value": "{{data.channel_id}}",
    },
  },
};

export default trigger;
