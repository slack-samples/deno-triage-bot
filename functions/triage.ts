import { SlackAPI } from "deno-slack-api/mod.ts";
import type { SlackAPIClient } from "deno-slack-api/types.ts";
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import ConfDatastore from "../datastores/conf.ts";
import InProgressEmojisDatastore from "../datastores/in_progress_emojis.ts";
import UrgencyEmojisDatastore from "../datastores/urgency_emojis.ts";
import DoneEmojisDatastore from "../datastores/done_emojis.ts";
import { ensureConversationsJoined } from "../lib/lib_slack.ts";
import UrlDatastore from "../datastores/url.ts";

export const TriageFunction = DefineFunction({
  callback_id: "triage",
  title: "Triage requests",
  description: "See outstanding requests by priorities",
  source_file: "functions/triage.ts",
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
      lookback_days: {
        description: "How many days should we look back?",
        type: Schema.types.string,
        default: "7",
      },
      // There seems to be an issue with taking in boolean input that aren't passed in as true
      // So we are making this a string for now, but should change it to boolean once the issue is resolved
      scheduled: {
        description: "Whether or not this message is scheduled.",
        type: Schema.types.string,
        default: "false",
      },
      output_channel_id: {
        type: Schema.slack.types.channel_id,
      },
    },
    required: ["channel_id"],
  },
  output_parameters: {
    properties: {},
    required: [],
  },
});

type ReactionType = {
  name: string;
  count: number;
  users: string[];
};

type botProfileType = {
  id: string;
  name: string;
};

type ConversationsHistoryArgsType = {
  channel: string;
  oldest: number;
  limit: number;
  cursor?: string;
};

type MessageType = {
  type: string;
  ts: string;
  text: string;
  attachments?: { [key: string]: string | number };
  team: string;
  user?: string;
  username?: string;
  subtype?: string;
  reactions?: ReactionType[];
  bot_profile?: botProfileType;
  file?: {
    reactions?: ReactionType[];
  };
  comment?: {
    comment: string;
    reactions?: ReactionType[];
  };
};

type channelType = {
  id: string;
  name: string;
  topic: {
    value: string;
  };
};

const URGENCY_EMOJIS: { [name: string]: number } = {
  ":red_circle:": 0,
  ":large_blue_circle:": 1,
  ":white_circle:": 2,
};

const REACJI_DONE = [
  "white_check_mark",
];

const REACJI_IN_PROGRESS = ["eyes"];

const NO_PENDING_REQUESTS_MSG = "Nothing is outstanding. :tada:";

export default SlackFunction(
  TriageFunction,
  async (
    { inputs, env, token },
  ) => {
    try {
      console.log(JSON.stringify({ ...env, ...inputs }));

      const channel_id = inputs.channel_id;
      const user_id = inputs.user_id;
      const output_channel_id = inputs.output_channel_id ?? inputs.channel_id;

      const slackClientOpts = "SLACK_API_URL" in env
        ? { slackApiUrl: env["SLACK_API_URL"] }
        : {};
      const client = SlackAPI(token, slackClientOpts);

      await ensureConversationsJoined(client, channel_id);
      if (channel_id !== output_channel_id) {
        await ensureConversationsJoined(client, output_channel_id);
      }

      const conf = await ConfDatastore.get(client, channel_id);
      if (
        inputs.lookback_days && Number(inputs.lookback_days) &&
        !inputs.scheduled
      ) {
        conf.lookback_days = inputs.lookback_days;
      }
      console.log("conf", conf);

      // Retrieve in-progress emojis from the datastore and add them to the default list
      let inProgressEmojis = await InProgressEmojisDatastore.getAll(client);
      inProgressEmojis = [...REACJI_IN_PROGRESS, ...inProgressEmojis];
      console.log("inProgressEmojis", inProgressEmojis);

      // Retrieve done emojis from the datastore and add them to the default list
      let doneEmojis = await DoneEmojisDatastore.getAll(client);
      doneEmojis = [...REACJI_DONE, ...doneEmojis];
      console.log("doneEmojis", doneEmojis);

      // Retrieve urgency emojis from the datastore and add them to the default list
      let urgencyEmojis = await UrgencyEmojisDatastore.getAll(client);
      urgencyEmojis = { ...URGENCY_EMOJIS, ...urgencyEmojis };
      console.log("urgencyEmojis", urgencyEmojis);

      const responders = await getMentionsFromChannelTopic(client, channel_id);

      const messages = await getChannelHistorySinceTime(
        channel_id,
        Number(conf.lookback_days),
        client,
      );

      const openRequests = await getOpenRequests(
        messages,
        urgencyEmojis,
        inProgressEmojis,
        doneEmojis,
      );
      const publicMessage = user_id == null;
      const scheduled = inputs.scheduled == "true";
      const summary = await buildSummary(
        scheduled,
        client,
        publicMessage,
        openRequests["outstanding"] ?? [],
        openRequests["inProgress"] ?? [],
        responders,
        channel_id,
        urgencyEmojis,
      );
      // if this is a scheduled trigger and either there are no pending requests OR the last most message is a message
      // from triagebot, do not post to channel.
      if (
        scheduled &&
        (summary === NO_PENDING_REQUESTS_MSG ||
          messages.length === 0 ||
          isFromTriagebot(messages[0]))
      ) {
        console.log(
          `Not sending scheduled message to channel_id ${output_channel_id} because it has no pending requests.`,
        );
        return { outputs: {} };
      }

      if (!publicMessage) {
        console.log(
          `sending private message to channel_id ${output_channel_id}...`,
        );
        const response = await client.apiCall("chat.postEphemeral", {
          channel: output_channel_id,
          user: user_id,
          text: summary,
          link_names: true,
          unfurl_links: false,
          unfurl_media: false,
        });
        if (!response["ok"]) throw new Error(response.error);
      } else {
        console.log(
          `sending public message to channel_id ${output_channel_id}...`,
        );
        const response = await client.apiCall("chat.postMessage", {
          channel: output_channel_id,
          text: summary,
          link_names: true,
          unfurl_links: false,
          unfurl_media: false,
        });
        if (!response["ok"]) throw new Error(response.error);
      }
      return { outputs: {} };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "unknown";
      console.log(error);
      return { error: msg };
    }
  },
);

async function getChannelHistorySinceTime(
  channel_id: string,
  day: number,
  client: SlackAPIClient,
) {
  const oldest = Date.now() / 1000 - day * 86400; // in seconds

  let allMessages = [] as MessageType[];
  let cursor = null;

  while (true) {
    const args = {
      channel: channel_id,
      oldest: oldest,
      limit: 100,
    } as ConversationsHistoryArgsType;
    if (cursor) {
      args["cursor"] = cursor;
    }
    const response = await client.apiCall("conversations.history", args);
    if (!response["ok"]) throw new Error(response.error);

    const messages = response["messages"] as MessageType[];
    allMessages = [...allMessages, ...messages];
    if (response["has_more"]) {
      const response_metadata = response["response_metadata"] as {
        "next_cursor": string;
      };
      cursor = response_metadata["next_cursor"];
    } else {
      break;
    }
  }
  return allMessages;
}

function isFromTriagebot(message: MessageType): boolean {
  if ((message.bot_profile?.name ?? "").includes("triagebot")) {
    return true;
  }

  if (message.username === "Triage Bot") {
    return true;
  }
  return false;
}

function isRequest(
  message: MessageType,
  urgencyEmojis: { [name: string]: number },
): boolean {
  // ignore messages sent by triagebot
  if (isFromTriagebot(message)) {
    return false;
  }

  // ignore topic change messages
  if (message.subtype === "channel_topic") {
    return false;
  }

  const msg_text = message["subtype"] === "file_comment"
    ? message.comment?.comment ?? message.text
    : message.text;

  const msg_attachment_text = message.attachments &&
      typeof message.attachments["text"] === "string"
    ? message.attachments["text"]
    : "";

  for (const emoji in urgencyEmojis) {
    if (msg_text.includes(emoji)) return true;
    if (msg_attachment_text.includes(emoji)) return true;
  }

  return false;
}

function getOpenRequests(
  messages: MessageType[],
  urgencyEmojis: { [name: string]: number },
  inProgressEmojis: string[],
  doneEmojis: string[],
) {
  const requests = messages.filter((msg) =>
    isRequest(msg, urgencyEmojis) && !isDone(msg, doneEmojis)
  );
  const outstanding = requests.filter((request) =>
    !isInProgress(request, inProgressEmojis, doneEmojis)
  );
  const inProgress = requests.filter((request) =>
    isInProgress(request, inProgressEmojis, doneEmojis)
  );
  return { "outstanding": outstanding, "inProgress": inProgress };
}

function hasReaction(
  message: MessageType,
  reaction_name: string,
): boolean {
  let reactions = message["reactions"] ?? [];
  if (
    message["file"] !== undefined && message["file"]["reactions"] !== undefined
  ) {
    reactions = [...reactions, ...message["file"]["reactions"]];
  }
  if (
    message["comment"] !== undefined &&
    message["comment"]["reactions"] !== undefined
  ) {
    reactions = [...reactions, ...message["comment"]["reactions"]];
  }
  for (const reaction of reactions) {
    if (reaction["name"] == reaction_name) return true;
  }
  return false;
}

function isDone(message: MessageType, done_emojis: string[]): boolean {
  for (const reacji of done_emojis) {
    if (hasReaction(message, reacji)) return true;
  }
  return false;
}

function isInProgress(
  message: MessageType,
  in_progress_emojis: string[],
  done_emojis: string[],
): boolean {
  if (isDone(message, done_emojis)) return false;
  for (const reacji of in_progress_emojis) {
    if (hasReaction(message, reacji)) return true;
  }
  return false;
}

async function buildSummary(
  scheduled: boolean,
  client: SlackAPIClient,
  publicMessage: boolean,
  outstanding: MessageType[],
  inProgress: MessageType[],
  responders: string[],
  channel_id: string,
  urgency_emojis: { [name: string]: number },
): Promise<string> {
  let summary = "";
  const outstandingCount = outstanding.length;
  const inProgressCount = inProgress.length;

  // Exit early if there are no outstanding requests.
  if (outstandingCount === 0 && inProgressCount === 0) {
    return NO_PENDING_REQUESTS_MSG;
  }

  if (publicMessage) {
    summary += "Hi there, ";
    summary += responders.length ? responders.join(" ") : `<#${channel_id}>`;
  } else {
    summary += `Here is your private summary of <#${channel_id}>`;
  }
  summary += "\n\n";

  if (outstandingCount > 0) {
    if (outstandingCount > 1) {
      summary +=
        `*There are ${outstandingCount} triage requests that no one has looked at* \n\n`;
    } else {
      summary += `*There is one triage request that no one has looked at* \n\n`;
    }
    if (!scheduled) {
      const requestSummary = await buildRequestSummary(
        client,
        outstanding,
        channel_id,
        publicMessage,
        urgency_emojis,
      );
      summary += requestSummary;
    }
  }
  if (inProgressCount > 0) {
    if (inProgressCount > 1) {
      summary +=
        `*There are ${inProgressCount} triage requests already being looked at* :eyes: \n\n`;
    } else {
      summary +=
        `*There is one triage request already being looked at* :eyes: \n\n`;
    }
    if (!scheduled) {
      const requestSummary = await buildRequestSummary(
        client,
        inProgress,
        channel_id,
        publicMessage,
        urgency_emojis,
      );
      summary += requestSummary;
    }
  }
  if (scheduled) {
    const privateShortcutUrl = await UrlDatastore.get(
      client,
      "private_shortcut",
    );
    summary +=
      `Trigger the triage workflow ${privateShortcutUrl} to see more information.`;
  }
  return summary;
}

async function buildRequestSummary(
  client: SlackAPIClient,
  requests: MessageType[],
  channel_id: string,
  publicMessage: boolean,
  urgencyEmojis: { [name: string]: number },
): Promise<string> {
  let summary = "";
  if (requests.length === 0) return summary;
  const sorted_requests = sortByPriorityandTime(requests, urgencyEmojis);

  for (const request of sorted_requests) {
    const priorityEmoji = getPriorityEmoji(request["text"], urgencyEmojis);
    //this should never happen, but guarding for an edge case.
    if (priorityEmoji === undefined) continue;

    const message_link = await getMsgPermalink(
      client,
      channel_id,
      request["ts"],
    );

    //build the message block
    summary += priorityEmoji;
    summary += " ";

    // Only at-mention users in the ephemeral message to prevent noise
    if (!publicMessage && request["user"]) {
      const date = new Date(parseInt(request["ts"]) * 1000);
      summary += `<@${request["user"]}> <${message_link}|posted on ${
        date.toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          hour: "numeric",
          timeZoneName: "shortGeneric",
          timeZone: "America/Los_Angeles",
        })
      }>`;
    } else {
      summary += message_link;
    }

    summary += "\n";
    summary += "> ";
    summary += request_message_format_for_summary(
      request["text"],
      urgencyEmojis,
    );
    summary += "\n";
  }
  return summary;
}

async function getMsgPermalink(
  client: SlackAPIClient,
  channel_id: string,
  ts: string,
): Promise<string> {
  const ret = await client.chat.getPermalink({
    channel: channel_id,
    message_ts: ts,
  });
  if (!ret["ok"]) throw new Error(ret.error);
  return ret["permalink"] as string;
}

async function getMentionsFromChannelTopic(
  client: SlackAPIClient,
  channel_id: string,
): Promise<string[]> {
  const response = await client.apiCall("conversations.info", {
    channel: channel_id,
  });
  if (!response["ok"]) throw new Error(response.error);
  const channel = response["channel"] as channelType;
  return getMentions(channel.topic.value);
}

export function getMentions(str: string): string[] {
  // E.g. <@U123ACA|dsmith> would become <@dsmith>
  const replaced = str.replace(/@[A-Z0-9]+\|/, "@");
  const matches = replaced.match(/(<@[A-Za-z0-9]+>)/g);
  return matches ? matches : [];
}

function sortByPriorityandTime(
  requests: MessageType[],
  priorityEmojis: { [emoji: string]: number },
) {
  requests.sort(
    function (a, b) {
      const priorityA = getPriority(a, priorityEmojis);
      const priorityB = getPriority(b, priorityEmojis);

      if (priorityA == priorityB) {
        return a["ts"] > b["ts"] ? 1 : -1;
      }
      return priorityA - priorityB;
    },
  );
  return requests;
}

function getPriority(
  message: MessageType,
  urgencyEmojis: { [emoji: string]: number },
): number {
  for (const emoji in urgencyEmojis) {
    if (message["text"].includes(emoji)) return urgencyEmojis[emoji];
  }
  return 2;
}

function getPriorityEmoji(
  text: string,
  urgencyEmojis: { [emoji: string]: number },
): string | undefined {
  const emoji = Object.keys(urgencyEmojis).find((emoji) =>
    text.includes(emoji)
  );
  return emoji;
}

function request_message_format_for_summary(
  message: string,
  urgencyEmojis: { [emoji: string]: number },
): string {
  // strip emojis
  Object.keys(urgencyEmojis).forEach((emoji) => {
    message = message.replace(emoji, "");
  });
  const ZWS = "\u{200B}";
  // add a space between a @ and a name so you dont at people
  const name_regex = "/<@.{1,12}\|{1}/ig";
  // delete url garbage so we dont break urls in the summary due to dangling url bits
  const url_regex = "/<.{1,}\|{1}/ig";

  message = message.replaceAll(name_regex, "@${ZWS}");
  message = message.replaceAll(url_regex, ZWS);
  message = message.replaceAll("<", "");
  message = message.replaceAll(">", "");
  message = message.replaceAll("\n", " ");
  message = message.replaceAll("|", " ");
  //truncate text
  if (message.length >= 80) message = message.slice(0, 80) + "...";
  // remove whitespace, newline, etc
  message = message.trim();

  return message;
}
