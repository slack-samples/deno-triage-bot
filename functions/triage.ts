import { SlackAPI } from "deno-slack-api/mod.ts";
import type { SlackAPIClient } from "deno-slack-api/types.ts";
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import ConfDatastore from "../datastores/conf.ts";
import { ensureConversationsJoined } from "../lib/lib_slack.ts";

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

type teamType = {
  id: string;
  name: string;
};

type channelType = {
  id: string;
  name: string;
  topic: {
    value: string;
  };
};

const URGENCY_EMOJIS: { [emoji: string]: number } = {
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
      if (inputs.lookback_days && Number(inputs.lookback_days)) {
        conf.lookback_days = inputs.lookback_days;
      }
      console.log("conf", conf);

      const responders = await getMentionsFromChannelTopic(client, channel_id);

      const messages = await getChannelHistorySinceTime(
        channel_id,
        Number(conf.lookback_days),
        client,
      );

      const openRequests = getOpenRequests(messages);
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
      );
      // if this is a scheduled trigger and either there are no pending requests OR the last most message is a message
      // from triagebot, do not post to channel.
      if (
        scheduled &&
        (summary === NO_PENDING_REQUESTS_MSG ||
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

function isRequest(message: MessageType): boolean {
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

  // TODO: get triage emoji from datastore, hard-coded for now
  for (const emoji in URGENCY_EMOJIS) {
    if (msg_text.includes(emoji)) return true;
  }

  return false;
}

function getOpenRequests(messages: MessageType[]) {
  const requests = messages.filter((msg) => isRequest(msg) && !isDone(msg));
  const outstanding = requests.filter((request) => !isInProgress(request));
  const inProgress = requests.filter((request) => isInProgress(request));
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

function isDone(message: MessageType): boolean {
  for (const reacji of REACJI_DONE) {
    if (hasReaction(message, reacji)) return true;
  }
  return false;
}

function isInProgress(message: MessageType): boolean {
  if (isDone(message)) return false;
  for (const reacji of REACJI_IN_PROGRESS) {
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
      );
      summary += requestSummary;
    }
  }
  if (scheduled) {
    summary += "Trigger the `triage` workflow to see more information.";
  }
  return summary;
}

async function buildRequestSummary(
  client: SlackAPIClient,
  requests: MessageType[],
  channel_id: string,
  publicMessage: boolean,
): Promise<string> {
  let summary = "";
  if (requests.length === 0) return summary;
  const sorted_requests = sortByPriorityandTime(requests);

  for (const request of sorted_requests) {
    const priorityEmoji = getPriorityEmoji(request["text"]);
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
    summary += request_message_format_for_summary(request["text"]);
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

function sortByPriorityandTime(requests: MessageType[]) {
  requests.sort(
    function (a, b) {
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA == priorityB) {
        return a["ts"] > b["ts"] ? 1 : -1;
      }
      return priorityA - priorityB;
    },
  );
  return requests;
}

function getPriority(message: MessageType): number {
  for (const emoji in URGENCY_EMOJIS) {
    if (message["text"].includes(emoji)) return URGENCY_EMOJIS[emoji];
  }
  return 2;
}

function getPriorityEmoji(text: string): string | undefined {
  const emoji = Object.keys(URGENCY_EMOJIS).find((emoji) =>
    text.includes(emoji)
  );
  return emoji;
}

function request_message_format_for_summary(message: string): string {
  // strip emojis
  Object.keys(URGENCY_EMOJIS).forEach((emoji) => {
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
  //truncate text
  if (message.length >= 80) message = message.slice(0, 80) + "...";
  // remove whitespace, newline, etc
  message = message.trim();

  return message;
}
