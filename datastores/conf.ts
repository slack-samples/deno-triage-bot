import { SlackAPIClient } from "deno-slack-api/types.ts";
import { isValidSchedule } from "../functions/post_scheduled_messages.ts";

export type DSChannelItem = {
  channel_id: string;
  lookback_days: string;
  // schedule in datastore has format of "cron1|cron2|cron3"
  schedule: string;
};

export type ChannelItem = {
  channel_id: string;
  lookback_days: string;
  // schedule has format of [cron1, cron2, cron3]
  schedule: string[];
};

export const channelItemToDsChannelItem = function (
  channel_item: ChannelItem,
): DSChannelItem {
  return {
    channel_id: channel_item.channel_id,
    lookback_days: channel_item.lookback_days,
    schedule: channel_item.schedule.join("|"),
  };
};

export const createChannelItem = function (
  channel_id: string,
  lookback_days: string,
  schedule: string,
): ChannelItem {
  let schedules: string[];
  if (schedule == "``") {
    schedules = [];
  } else {
    schedules = schedule.split("|");
    if (!schedules.every((x) => isValidSchedule(x))) {
      throw new Error(`bad schedule: ${schedule}`);
    }
  }
  if (!Number(lookback_days)) {
    throw new Error(`bad lookback_days: ${lookback_days}`);
  }

  return {
    channel_id,
    lookback_days,
    schedule: schedules,
  };
};

export default class ConfDatastore {
  private static readonly DATASTORE_NAME = "conf";

  static get = async (
    client: SlackAPIClient,
    channel_id: string,
  ): Promise<ChannelItem> => {
    console.log("[ConfDatastore.get]", `channel_id=${channel_id}`);
    const ret = await client.apps.datastore.get({
      datastore: this.DATASTORE_NAME,
      id: channel_id,
    });
    if (!ret.ok) throw new Error(ret.error);

    const conf = ret.item as DSChannelItem;
    console.log("[ConfDatastore.get]", conf);

    let schedule = Array<string>();
    if (Object.keys(conf).length === 0) {
      return {
        "channel_id": channel_id,
        "lookback_days": "7",
        "schedule": schedule,
      } as ChannelItem;
    }
    if (conf.schedule) {
      schedule = ret.item.schedule.split("|");
    }
    return {
      "channel_id": channel_id,
      "lookback_days": ret.item.lookback_days ?? "7",
      "schedule": schedule,
    } as ChannelItem;
  };

  static getAll = async (
    client: SlackAPIClient,
  ): Promise<Array<ChannelItem>> => {
    console.log("Getting all confs from the datastore...");
    const ret = await client.apps.datastore.query({
      datastore: this.DATASTORE_NAME,
    });
    if (!ret.ok) throw new Error(ret.error);
    const confs = ret.items as DSChannelItem[];
    console.log(`Found ${confs.length} confs in the datastore.`);
    const transformed_confs = Array<ChannelItem>();
    for (const conf of confs) {
      let schedule = Array<string>();
      if (!conf.schedule) {
        schedule = [];
      } else {
        schedule = conf.schedule.split("|");
      }
      const transformed_conf = {
        "channel_id": conf.channel_id,
        "lookback_days": conf.lookback_days ?? 7,
        "schedule": schedule,
      } as ChannelItem;
      transformed_confs.push(transformed_conf);
    }
    return transformed_confs;
  };

  static put = async (
    client: SlackAPIClient,
    conf: DSChannelItem,
  ): Promise<void> => {
    console.log("[ConfDatastore.put]", conf);
    const ret = await client.apps.datastore.put({
      datastore: this.DATASTORE_NAME,
      item: conf,
    });
    if (!ret.ok) throw new Error(ret.error);
  };

  static clearSchedule = async (
    client: SlackAPIClient,
    channelId: string,
  ): Promise<void> => {
    console.log("[ConfDatastore.clearSchedule]", channelId);
    const conf = await this.get(client, channelId);
    const dsConf = channelItemToDsChannelItem(conf);
    if (dsConf.schedule) {
      dsConf.schedule = "";
      const ret = await client.apps.datastore.put({
        datastore: this.DATASTORE_NAME,
        item: dsConf,
      });
      if (!ret.ok) throw new Error(ret.error);
    }
  };
}
