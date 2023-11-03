import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { TriageFunction } from "../functions/triage.ts";

const PrivateReportWorkflow = DefineWorkflow({
  callback_id: "private_report_workflow",
  title: "Post a private triage report to the current channel.",
  input_parameters: {
    properties: {
      user_id: {
        description: "User who will see this private message.",
        type: Schema.slack.types.user_id,
      },
      channel_id: {
        description: "Channel to post message in.",
        type: Schema.slack.types.channel_id,
      },
      lookback_days: {
        description: "How many days should we look back?",
        type: Schema.types.string,
      },
    },
    required: ["user_id", "channel_id"],
  },
});

PrivateReportWorkflow.addStep(TriageFunction, {
  user_id: PrivateReportWorkflow.inputs.user_id,
  channel_id: PrivateReportWorkflow.inputs.channel_id,
  lookback_days: PrivateReportWorkflow.inputs.lookback_days,
});

export default PrivateReportWorkflow;
