export const renderCollectLookbackDaysView = (
  channel_id: string,
  user_id: string,
) => {
  return {
    "type": "modal",
    "callback_id": "collect_lookback_days_view",
    "title": {
      "type": "plain_text",
      "text": "Triage by Lookback Days",
    },
    "submit": {
      "type": "plain_text",
      "text": "Submit",
    },
    "blocks": [
      {
        "type": "input",
        "block_id": "lookback_days_block",
        "element": {
          "type": "plain_text_input",
          "action_id": "lookback_days",
          "initial_value": "7",
        },
        "label": {
          "type": "plain_text",
          "text": ":rewind: How many days should we look back for requests?",
        },
      },
    ],
    "private_metadata": JSON.stringify({
      "channel_id": channel_id,
      "user_id": user_id,
    }),
  };
};
