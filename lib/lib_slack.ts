import { Env } from "deno-slack-sdk/types.ts";
import { SlackAPIClient } from "deno-slack-api/types.ts";
import { SlackAPI } from "deno-slack-api/mod.ts";
import ConfDatastore from "../datastores/conf.ts";

export const getSlackApiClient = (token: string, env: Env): SlackAPIClient => {
  const slackClientOpts = "SLACK_API_URL" in env
    ? { slackApiUrl: env["SLACK_API_URL"] }
    : {};
  return SlackAPI(token, slackClientOpts);
};

/**
 * Ensure this app has joined the given channel. Since this is relatively low volume, simply join
 * the channel, which the docs say returns successful, with a non-fatal `already_in_channel`
 * warning if already joined.
 *
 * @see https://api.slack.com/methods/conversations.join
 */
export async function ensureConversationsJoined(
  client: SlackAPIClient,
  channelId: string,
): Promise<void> {
  const ret = await client.conversations.join({ channel: channelId });
  if (!ret.ok) {
    if (ret.error === "is_archived") {
      console.log(`Removing schedule from archived channel ${channelId}`);
      await ConfDatastore.clearSchedule(client, channelId);
    }
    if (ret.error === "method_not_supported_for_channel_type") {
      console.log(`Removing schedule from private channel ${channelId}`);
      await ConfDatastore.clearSchedule(client, channelId);
    }
    throw new Error(ret.error);
  }
}
