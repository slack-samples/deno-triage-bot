import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { TriageFunction } from "../functions/triage.ts";

const PublicReportWorkflow = DefineWorkflow({
  callback_id: "public_report_workflow",
  title: "Post a triage report to the current channel.",
  input_parameters: {
    properties: {
      channel_id: {
        description: "Channel to post the message in.",
        type: Schema.slack.types.channel_id,
      },
      scheduled: {
        description: "Whether or not this message is scheduled.",
        type: Schema.types.string,
        default: "false",
      },
      lookback_days: {
        description: "How many days should we look back?",
        type: Schema.types.string,
      },
      output_channel_id: {
        type: Schema.slack.types.channel_id,
      },
    },
    required: ["channel_id"],
  },
});

PublicReportWorkflow.addStep(TriageFunction, {
  channel_id: PublicReportWorkflow.inputs.channel_id,
  scheduled: PublicReportWorkflow.inputs.scheduled,
  lookback_days: PublicReportWorkflow.inputs.lookback_days,
  output_channel_id: PublicReportWorkflow.inputs.output_channel_id,
});

export default PublicReportWorkflow;
