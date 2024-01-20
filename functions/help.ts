import { ensureConversationsJoined } from "../lib/lib_slack.ts";
import {
  DefineFunction,
  Schema,
  SlackAPI,
  SlackFunction,
} from "deno-slack-sdk/mod.ts";
import UrlDatastore from "../datastores/url.ts";
import type { SlackAPIClient } from "deno-slack-api/types.ts";

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
    const helpText = await helpTextGenerator(channel_id, client);
    const response = await client.apiCall("chat.postEphemeral", {
      channel: channel_id,
      user: user_id,
      text: helpText,
    });
    if (!response["ok"]) throw new Error(response.error);
    return { outputs: {} };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    console.log(error);
    return { error: msg };
  }
});

export async function helpTextGenerator(
  channel_id: string,
  client: SlackAPIClient,
): Promise<string> {
  const privateShortcutUrl = await UrlDatastore.get(
    client,
    "private_shortcut",
  );
  const publicShortcutUrl = await UrlDatastore.get(client, "public_shortcut");
  const triageShortcutUrl = await UrlDatastore.get(
    client,
    "triage_shortcut",
  );
  const manageShortcutUrl = await UrlDatastore.get(
    client,
    "manage_shortcut",
  );

  return `
Here’s how :hospital: *Triage Bot* works:
> I look at messages posted in this channel during the last week.
> I only care about messages that have :red_circle:, :large_blue_circle:, or :white_circle:.
> A message with :eyes: reaction is in progress. A message with :white_check_mark: reaction is done. Otherwise, it’s still pending.

What do those emoji mean?
> :red_circle: *Urgent*, needs a response from engineering triage hosts now
> :large_blue_circle: *Not as urgent*, needs a response within the day or needs clarity or direction from the triage hosts
> :white_circle: *Question or clarification*, needs guidance as to next steps

Below are the workflows for Triagebot, you can search them using the \`More > Automations > Workflows\` page

- \`triage\` to get a report of triage requests in <#${channel_id}>
Workflow Link: ${privateShortcutUrl}

- \`triage publish\` to publish the triage info in <#${channel_id}>
Workflow Link: ${publicShortcutUrl}

- \`Triage by lookback days\` to get a report of triage requests in <#${channel_id}> with your specified lookback days
Workflow Link: ${triageShortcutUrl}

- \`Manage Triagebot Configuration\` to configure settings for sending scheduled posts to a channel
Workflow Link: ${manageShortcutUrl}
`;
}
