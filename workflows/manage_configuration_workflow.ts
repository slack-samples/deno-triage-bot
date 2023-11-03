import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ManageConfigurationFunction } from "../functions/manage_configuration.ts";

const ManageConfigurationWorkflow = DefineWorkflow({
  callback_id: "manage_configuration_workflow",
  title: "Manage Triagebot Configuration",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
      },
      interactivity_context: {
        type: Schema.slack.types.interactivity,
      },
    },
    required: ["user_id", "interactivity_context"],
  },
});

ManageConfigurationWorkflow.addStep(ManageConfigurationFunction, {
  user_id: ManageConfigurationWorkflow.inputs.user_id,
  interactivity: ManageConfigurationWorkflow.inputs.interactivity_context,
});

export default ManageConfigurationWorkflow;
