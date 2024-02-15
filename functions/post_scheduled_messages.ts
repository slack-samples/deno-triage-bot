import { parseExpression } from "cron-parser/parse.ts";
import ConfDatastore from "../datastores/conf.ts";
import { SlackAPI } from "deno-slack-api/mod.ts";
import type { SlackAPIClient } from "deno-slack-api/types.ts";
import { DefineFunction, SlackFunction } from "deno-slack-sdk/mod.ts";
import UrlDatastore from "../datastores/url.ts";

export const PostScheduledMessagesFunction = DefineFunction({
  callback_id: "post_scheduled_messages",
  title: "post_scheduled_messages",
  source_file: "functions/post_scheduled_messages.ts",
  input_parameters: {
    properties: {},
    required: [],
  },
  output_parameters: { properties: {}, required: [] },
});

/**
 * To simplify scheduled posts, rather than having per-channel scheduled triggers,
 * run this function every period of time, and it will figure out which channels
 * to post in.
 */
export default SlackFunction(
  PostScheduledMessagesFunction,
  async ({ env, token }) => {
    const now = new Date();
    console.log(
      `Running scheduled trigger at ${now}: \n`,
    );

    const slackClientOpts = "SLACK_API_URL" in env
      ? { slackApiUrl: env["SLACK_API_URL"] }
      : {};
    const client = SlackAPI(token, slackClientOpts);

    // get webhook trigger for public report from datastore
    const public_webhook_url = await UrlDatastore.get(client, "public_webhook");
    try {
      const channelIds = await getChannelIds(client);

      for (const channelId of channelIds) {
        await tripPublicReportWebhookTrigger(
          token,
          public_webhook_url,
          channelId,
        );
      }
      return { outputs: {} };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "unknown";
      console.log(error);
      return { error: msg };
    }
  },
);

async function getChannelIds(client: SlackAPIClient): Promise<string[]> {
  const channelIds = Array<string>();
  const confs = await ConfDatastore.getAll(client);
  const now = new Date();
  for (const conf of confs) {
    const schedule_str = JSON.stringify(conf.schedule);
    try {
      if (shouldRun(now, conf["schedule"])) {
        console.log(
          `Matched channel ${conf.channel_id} with schedule '${schedule_str}' at '${now.toString()}'`,
        );
        channelIds.push(conf["channel_id"]);
      } else {
        console.log(
          `Skipping channel ${conf.channel_id} with schedule '${schedule_str}' at '${now.toString()}'`,
        );
      }
    } catch (error) {
      console.log(`error encountered ${error}, channel id: ${conf.channel_id}`);
    }
  }
  return channelIds;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function tripPublicReportWebhookTrigger(
  token: string,
  url: string,
  channel_id: string,
): Promise<void> {
  console.log(
    `Tripping trigger to post in channel ${channel_id} with url ${url}}`,
  );

  /**
   * Sleep for six second before making the webhook API call because the Slack API has a 10 per
   * minute rate limit for this request type. In production, we observed "Too Many Requests"
   * errors when attempting to rapidly trip all the per-channel webhook triggers.
   *
   * @see https://api.slack.com/docs/rate-limits
   */
  await sleep(6000);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      "channel_id": channel_id,
      "scheduled": "true",
      "lookback_days": "0",
    }),
  });
  if (!resp.ok) throw new Error(resp.statusText);
}

export function isValidSchedule(schedule: string): boolean {
  try {
    const parsedSchedule = parseExpression(schedule);
    if (parsedSchedule[4].length !== 12) {
      console.log("Month specification is not supported by triagebot");
      return false;
    }
    if (parsedSchedule[3].length < 28) {
      console.log("Day of month specification is not supported by triagebot");
      return false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
  return true;
}

export function adjustUTC(time: Date, timezone: string): Date {
  // adjust UTC based on the timezone specified
  // example: 2022-07-08T00:00 PDT => 2022-07-08T00:00 UTC
  // We need to adjust to UTC because we need to use getUTCDay and getUTCHours which do not rely on local time
  const newTime = time.toLocaleString("en-US", {
    timeZone: timezone,
  });
  return new Date(newTime + " UTC");
}

//given a date object, and the cron expression for a channels schedule, determine if the triage report should run.
//we currently only support hourly granularity so we only need to check what day and what hour of the day to determine eligibility.
// we also expect cron_expression to always be valid. We utilize another function, isValid, to ensure the cron definition
// meets our constraints.
export function shouldRun(time: Date, cron_expressions: string[]): boolean {
  const adjustedUTC = adjustUTC(time, "America/Los_Angeles");
  const dayOfWeek = adjustedUTC.getUTCDay();
  const hour = adjustedUTC.getUTCHours();
  for (const cron_expression of cron_expressions) {
    const expanded_cron = parseExpression(cron_expression);
    if (
      expanded_cron[2].includes(hour) &&
      expanded_cron[5].includes(dayOfWeek)
    ) {
      return true;
    }
  }
  return false;
}
