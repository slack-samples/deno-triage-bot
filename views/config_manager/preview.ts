import { ChannelItem } from "../../datastores/conf.ts";

export const renderPreviewView = (
  currentConf: ChannelItem,
  proposedConf: ChannelItem,
) => {
  const view = {
    "type": "modal",
    "callback_id": "preview_view",
    "title": {
      "type": "plain_text",
      "text": "Configure Triagebot",
    },
    "close": {
      "type": "plain_text",
      "text": "Cancel",
    },
    "submit": {
      "type": "plain_text",
      "text": "Submit",
    },
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text":
            `Change the Triagebot configuration for <#${currentConf.channel_id}>? Submitting this change will notify the channel.`,
        },
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Current*\n\`\`\`${
            JSON.stringify(currentConf, null, 2)
          }\`\`\``,
        },
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Proposed*\n\`\`\`${
            JSON.stringify(proposedConf, null, 2)
          }\`\`\``,
        },
      },
    ],
    "private_metadata": JSON.stringify({
      "current_conf": currentConf,
      "proposed_conf": proposedConf,
    }),
  };

  return view;
};
