import { ChannelItem } from "../../datastores/conf.ts";

export const renderCollectNewConfigView = (
  current_channel_conf: ChannelItem,
) => {
  const view = {
    "type": "modal",
    "callback_id": "collect_new_config_view",
    "title": {
      "type": "plain_text",
      "text": "Configure Triagebot",
    },
    "submit": {
      "type": "plain_text",
      "text": "Next",
    },
    "close": {
      "type": "plain_text",
      "text": "Cancel",
    },
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text":
            `:hammer_and_wrench: Updating configuration for <#${current_channel_conf.channel_id}>`,
        },
      },
      {
        "type": "divider",
      },
      {
        "type": "input",
        "block_id": "lookback_days_block",
        "label": {
          "type": "plain_text",
          "text": ":rewind: How many days should we look back for requests?",
        },
        "element": {
          "type": "plain_text_input",
          "action_id": "lookback_days",
          "initial_value": `${current_channel_conf.lookback_days}`,
        },
      },
      {
        "type": "divider",
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text":
            ":calendar: What <https://crontab.guru|cron> schedule should messages be posted to the channel?",
        },
      },
      {
        "type": "input",
        "block_id": "schedule_block",
        "label": {
          "type": "plain_text",
          "text": "Schedule",
        },
        "element": {
          "type": "plain_text_input",
          "action_id": "schedule",
          "initial_value": `${current_channel_conf.schedule.join("|")}`,
        },
      },
    ],
    "private_metadata": JSON.stringify({
      "channel_id": current_channel_conf.channel_id,
    }),
  };

  return view;
};
