import { DefineWorkflow } from "deno-slack-sdk/mod.ts";
import { PostScheduledMessagesFunction } from "../functions/post_scheduled_messages.ts";

const PostScheduledMessagesWorkflow = DefineWorkflow({
  callback_id: "post_scheduled_messages_workflow",
  title: "post_scheduled_messages_workflow",
  input_parameters: {
    properties: {},
    required: [],
  },
});

PostScheduledMessagesWorkflow.addStep(PostScheduledMessagesFunction, {});

export default PostScheduledMessagesWorkflow;
