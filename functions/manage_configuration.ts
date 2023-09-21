import { renderSelectChannelView } from "../views/config_manager/select_channel.ts";
import { renderCollectNewConfigView } from "../views/config_manager/collect_new_config.ts";
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import ConfDatastore, {
  ChannelItem,
  channelItemToDsChannelItem,
  createChannelItem,
} from "../datastores/conf.ts";
import { renderPreviewView } from "../views/config_manager/preview.ts";
import {
  ensureConversationsJoined,
  getSlackApiClient,
} from "../lib/lib_slack.ts";

export const ManageConfigurationFunction = DefineFunction({
  callback_id: "manage_configuration_function",
  title: "Manage Triagebot configuration for a channel",
  source_file: "functions/manage_configuration.ts",
  input_parameters: {
    properties: {
      user_id: {
        type: Schema.slack.types.user_id,
      },
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
    },
    required: ["user_id", "interactivity"],
  },
  output_parameters: {
    properties: {},
    required: [],
  },
});

/**
 * Entry point for the Triagebot Configuration Manager. The intended use is adding a trigger to
 * this workflow in the Triagebot admin channel, and users can progress through the wizard to
 * manage their per-channel Triagebot configuration.
 *
 * When a user clicks a link trigger to trip this workflow, we open a modal, which is then
 * updated as users progress through the wizard.
 */
export default SlackFunction(
  ManageConfigurationFunction,
  async ({ inputs, env, token }) => {
    const client = getSlackApiClient(token, env);
    const ret = await client.views.open({
      trigger_id: inputs.interactivity.interactivity_pointer,
      view: renderSelectChannelView(),
    });
    if (!ret["ok"]) throw new Error(ret.error);

    // Do not complete the function, so it can handle view interactions.
    return {
      completed: false,
    };
  },
)
  /**
   * Handle `select_channel_view` view submission.
   *
   * Now that we know which channel the user wants to configure, fetch its configuration and
   * display a view for the user to input new values.
   */
  .addViewSubmissionHandler(
    "select_channel_view",
    async ({ view, token, env }) => {
      const client = getSlackApiClient(token, env);
      const channel_id = view.state
        .values["select_channel_block"]["channel_id"]["selected_channel"];
      // Exit early if Triagebot cannot join the channel being configured. This is required so we
      // can later notify the channel about the change.
      await ensureConversationsJoined(client, channel_id);
      const conf = await ConfDatastore.get(client, channel_id);
      return {
        response_action: "update",
        view: renderCollectNewConfigView(conf),
      };
    },
  )
  /**
   * Handle `collect_new_config_view` view submission.
   *
   * The user has input new configuration values. Validate the input, and update the view with
   * a confirmation.
   */
  .addViewSubmissionHandler(
    "collect_new_config_view",
    async ({ view, token, env }) => {
      const client = getSlackApiClient(token, env);
      /**
       * Private metadata is used to pass state between views because this data is ephemeral
       * and does not need to be stored in a datastore. More complex interactions that do want
       * persistance could use the datastore.
       */
      const privateMetadata = JSON.parse(view.private_metadata ?? "");
      const channelId = privateMetadata["channel_id"];
      const currentConf = await ConfDatastore.get(client, channelId);
      const proposedLookbackDays: string =
        view.state.values["lookback_days_block"]["lookback_days"]["value"];
      const proposedSchedule: string =
        view.state.values["schedule_block"]["schedule"]["value"];
      const proposedConf = createChannelItem(
        channelId,
        proposedLookbackDays,
        proposedSchedule,
      );
      return {
        response_action: "update",
        view: renderPreviewView(currentConf, proposedConf),
      };
    },
  )
  /**
   * Handle `preview_view` view submission.
   *
   * The user has submitted the change request, so update the database, and notify the
   * affected channel.
   */
  .addViewSubmissionHandler(
    "preview_view",
    async ({ view, body, token, env }) => {
      const client = getSlackApiClient(token, env);
      const privateMetadata = JSON.parse(view.private_metadata ?? "");
      const oldConf = privateMetadata["current_conf"] as ChannelItem;
      const newConf = privateMetadata["proposed_conf"] as ChannelItem;
      const dsChannelItem = channelItemToDsChannelItem(newConf);
      await ConfDatastore.put(client, dsChannelItem);

      let lookbackDaysText = `- Lookback days: ${newConf.lookback_days}`;
      if (newConf.lookback_days !== oldConf.lookback_days) {
        lookbackDaysText += ` (was ${oldConf.lookback_days})`;
      }

      let scheduleText = `- Schedule: \`${newConf.schedule.join(", ")}\``;
      if (newConf.schedule.join(", ") !== oldConf.schedule.join(", ")) {
        scheduleText += ` (was \`${oldConf.schedule.join(", ")}\`)`;
      }

      const blocks = [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text":
              `:hammer_and_wrench: Triagebot configuration for <#${newConf.channel_id}> was changed by <@${body.user.id}>:`,
          },
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": lookbackDaysText,
          },
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": scheduleText,
          },
        },
      ];

      const ret = await client.apiCall("chat.postMessage", {
        channel: newConf.channel_id,
        blocks: JSON.stringify(blocks),
      });
      if (!ret.ok) throw new Error(ret.error);

      // Complete the function because interaction is complete.
      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {},
      });
    },
  );
