import { renderCollectLookbackDaysView } from "../views/triage_by_lookback_days/collect_lookback_days.ts";
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { getSlackApiClient } from "../lib/lib_slack.ts";
import UrlDatastore from "../datastores/url.ts";

export const TriageByDaysFunction = DefineFunction({
  callback_id: "triage_by_days_function",
  title: "Triage by lookback days",
  source_file: "functions/triage_by_days.ts",
  input_parameters: {
    properties: {
      user_id: {
        description: "User to send report to",
        type: Schema.slack.types.user_id,
      },
      channel_id: {
        description: "Channel to triage",
        type: Schema.slack.types.channel_id,
      },
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
    },
    required: ["user_id", "channel_id", "interactivity"],
  },
  output_parameters: {
    properties: {},
    required: [],
  },
});

export default SlackFunction(
  TriageByDaysFunction,
  async ({ inputs, env, token }) => {
    const client = getSlackApiClient(token, env);
    const ret = await client.views.open({
      trigger_id: inputs.interactivity.interactivity_pointer,
      view: renderCollectLookbackDaysView(inputs.channel_id, inputs.user_id),
    });
    if (!ret["ok"]) throw new Error(ret.error);

    // Do not complete the function, so it can handle view interactions.
    return {
      completed: false,
    };
  },
)
  /**
   * Handle `collect_lookback_days_view` view submission.
   */
  .addViewSubmissionHandler(
    "collect_lookback_days_view",
    async ({ view, body, token, env }) => {
      const client = getSlackApiClient(token, env);
      const lookbackDays: string =
        view.state.values["lookback_days_block"]["lookback_days"]["value"];
      // get webhook trigger for private report from datastore
      const private_webhook_url = await UrlDatastore.get(
        client,
        "private_webhook",
      );
      const privateMetadata = JSON.parse(view.private_metadata ?? "");
      const channelId = privateMetadata["channel_id"];
      const userId = privateMetadata["user_id"];

      await tripPrivateReportWebhookTrigger(
        token,
        private_webhook_url,
        channelId,
        userId,
        lookbackDays,
      );

      // Complete the function because interaction is complete.
      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {},
      });
    },
  );

async function tripPrivateReportWebhookTrigger(
  token: string,
  url: string,
  channel_id: string,
  user_id: string,
  lookback_days: string,
): Promise<void> {
  console.log(
    `Tripping trigger to post in channel ${channel_id} to ${user_id} with url ${url}}`,
  );

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      "user_id": user_id,
      "channel_id": channel_id,
      "lookback_days": lookback_days,
    }),
  });
  if (!resp.ok) throw new Error(resp.statusText);
}
