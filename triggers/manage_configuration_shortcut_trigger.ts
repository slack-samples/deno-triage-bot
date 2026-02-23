import { Trigger } from "@slack/api/types";
import ManageConfigurationWorkflow from "../workflows/manage_configuration_workflow.ts";

const trigger: Trigger<typeof ManageConfigurationWorkflow.definition> = {
  type: "shortcut",
  name: "Manage Triagebot Configuration",
  workflow: "#/workflows/manage_configuration_workflow",
  inputs: {
    "user_id": {
      "value": "{{data.user_id}}",
    },
    "interactivity_context": {
      "value": "{{data.interactivity}}",
    },
  },
};

export default trigger;
