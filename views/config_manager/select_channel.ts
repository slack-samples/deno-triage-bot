export const renderSelectChannelView = () => {
  return {
    "type": "modal",
    "callback_id": "select_channel_view",
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
      "text": "Next",
    },
    "blocks": [
      {
        "type": "input",
        "block_id": "select_channel_block",
        "label": {
          "type": "plain_text",
          "text": "Select a channel to configure.",
        },
        "element": {
          "type": "channels_select",
          "placeholder": {
            "type": "plain_text",
            "text": "Select a channel to configure.",
          },
          "action_id": "channel_id",
        },
      },
    ],
  };
};
