import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { HelpFunction } from "../functions/help.ts";

const HelpWorkflow = DefineWorkflow({
  callback_id: "post_help_text_workflow",
  title: "post_help_text_workflow",
  input_parameters: {
    properties: {
      user_id: {
        description: "Post a message only visible to this user?",
        type: Schema.slack.types.user_id,
      },
      channel_id: {
        description: "Which channel should I post the info to?",
        type: Schema.slack.types.channel_id,
      },
    },
    required: ["user_id", "channel_id"],
  },
});

HelpWorkflow.addStep(HelpFunction, {
  user_id: HelpWorkflow.inputs.user_id,
  channel_id: HelpWorkflow.inputs.channel_id,
});

export default HelpWorkflow;
