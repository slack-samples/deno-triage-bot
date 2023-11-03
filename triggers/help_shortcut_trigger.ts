import { Trigger } from "deno-slack-api/types.ts";
import HelpWorkflow from "../workflows/help_workflow.ts";

const trigger: Trigger<typeof HelpWorkflow.definition> = {
  type: "shortcut",
  name: "Triagebot Help",
  workflow: "#/workflows/post_help_text_workflow",
  inputs: {
    user_id: {
      value: "{{data.user_id}}",
    },
    channel_id: {
      value: "{{data.channel_id}}",
    },
  },
};

export default trigger;
