import { SlackAPI } from "deno-slack-api/mod.ts";
import { ensureConversationsJoined } from "../lib/lib_slack.ts";
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const HelpFunction = DefineFunction({
  callback_id: "help",
  title: "Post Help Text",
  source_file: "functions/help.ts",
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
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(HelpFunction, async (
  { inputs, env, token },
) => {
  try {
    console.log(JSON.stringify({ ...env, ...inputs }));

    const channel_id = inputs.channel_id;
    const user_id = inputs.user_id;

    const slackClientOpts = "SLACK_API_URL" in env
      ? { slackApiUrl: env["SLACK_API_URL"] }
      : {};
    const client = SlackAPI(token, slackClientOpts);

    await ensureConversationsJoined(client, inputs.channel_id);
    const response = await client.apiCall("chat.postEphemeral", {
      channel: channel_id,
      user: user_id,
      text: help_text_generator(channel_id),
    });
    if (!response["ok"]) throw new Error(response.error);
    return { outputs: {} };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    console.log(error);
    return { error: msg };
  }
});

export function help_text_generator(
  channel_id: string,
): string {
  return `
Here’s how :hospital: *Triage Bot* works:
> I look at messages posted in this channel during the last week.
> I only care about messages that have :red_circle:, :blue_circle:, or :white_circle:.
> A message with :eyes: reaction is in progress. A message with :done: reaction is done. Otherwise, it’s still pending.

What do those emoji mean?
> :red_circle: *Urgent*, needs a response from engineering triage hosts now
> :blue_circle: *Not as urgent*, needs a response within the day or needs clarity or direction from the triage hosts
> :white_circle: *Question or clarification*, needs guidance as to next steps

Below are the workflows for Triagebot, you can either click on the workflow link below, or search them using the \`More > Automations > Workflows\` page

- \`triage\` to get a report of triage requests in <#${channel_id}>
Workflow link: https://slack.com/shortcuts/Ft05KUM0GR0B/3ee8f40768cba8a9cea718f9892ce94a

- \`triage publish\` to publish the triage info in <#${channel_id}>
Workflow link: https://slack.com/shortcuts/Ft05KE88MEBH/699ddd94a0d7d0a729338068b1d31f4a

- \`Triage by lookback days\` to get a report of triage requests in <#${channel_id}> with your specified lookback days
Workflow link: https://slack.com/shortcuts/Ft05L78FGK2M/57c0b29b43a6635f3f5f947f9620d17f

- \`Manage Triagebot Configuration\` to configure settings for sending scheduled posts to a channel
Workflow link: https://slack.com/shortcuts/Ft041W2HCLTE/72f5172e5a9e1252ae698b6a8d1b8dc2

`;
}
