import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { TriageByDaysFunction } from "../functions/triage_by_days.ts";

const TriageByDaysWorkflow = DefineWorkflow({
  callback_id: "triage_by_days_workflow",
  title: "Triage by lookback days",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
      },
      channel_id: {
        description: "Channel to post message in.",
        type: Schema.slack.types.channel_id,
      },
      interactivity_context: {
        type: Schema.slack.types.interactivity,
      },
    },
    required: ["user_id", "channel_id", "interactivity_context"],
  },
});

TriageByDaysWorkflow.addStep(TriageByDaysFunction, {
  user_id: TriageByDaysWorkflow.inputs.user_id,
  channel_id: TriageByDaysWorkflow.inputs.channel_id,
  interactivity: TriageByDaysWorkflow.inputs.interactivity_context,
});

export default TriageByDaysWorkflow;
