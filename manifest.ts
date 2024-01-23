import { DefineDatastore, Manifest, Schema } from "deno-slack-sdk/mod.ts";
import HelpWorkflow from "./workflows/help_workflow.ts";
import ManageConfigurationWorkflow from "./workflows/manage_configuration_workflow.ts";
import PostScheduledMessagesWorkflow from "./workflows/post_scheduled_messages_workflow.ts";
import PrivateReportWorkflow from "./workflows/private_report_workflow.ts";
import PublicReportWorkflow from "./workflows/public_report_workflow.ts";
import TriageByDaysWorkflow from "./workflows/triage_by_days_workflow.ts";

export const ConfDatastore = DefineDatastore({
  name: "conf",
  primary_key: "channel_id",
  attributes: {
    channel_id: {
      type: Schema.types.string,
    },
    lookback_days: {
      type: Schema.types.string,
    },
    schedule: {
      type: Schema.types.string,
    },
  },
});

export const UrlDatastore = DefineDatastore({
  name: "url",
  primary_key: "name",
  attributes: {
    name: {
      type: Schema.types.string,
    },
    url: {
      type: Schema.types.string,
    },
  },
});

export const DoneEmojisDatastore = DefineDatastore({
  name: "done_emojis",
  primary_key: "name",
  attributes: {
    name: {
      type: Schema.types.string,
    },
  },
});

export const UrgencyEmojisDatastore = DefineDatastore({
  name: "urgency_emojis",
  primary_key: "name",
  attributes: {
    name: {
      type: Schema.types.string,
    },
    urgency: {
      type: Schema.types.number,
    },
  },
});

export const inProgressEmojisDatastore = DefineDatastore({
  name: "in_progress_emojis",
  primary_key: "name",
  attributes: {
    name: {
      type: Schema.types.string,
    },
    url: {
      type: Schema.types.string,
    },
  },
});

export default Manifest({
  name: "triagebot-on-platform",
  description: "Triagebot on Platform 2.0",
  icon: "assets/icon.png",
  workflows: [
    HelpWorkflow,
    ManageConfigurationWorkflow,
    PostScheduledMessagesWorkflow,
    PrivateReportWorkflow,
    PublicReportWorkflow,
    TriageByDaysWorkflow,
  ],
  datastores: [
    ConfDatastore,
    UrlDatastore,
    DoneEmojisDatastore,
    UrgencyEmojisDatastore,
    inProgressEmojisDatastore,
  ],
  outgoingDomains: ["hooks.slack.com", "hooks.dev.slack.com"],
  botScopes: [
    "channels:history",
    "channels:join",
    "channels:read",
    "chat:write.public",
    "chat:write",
    "commands",
    "datastore:read",
    "datastore:write",
    "team:read",
  ],
});
