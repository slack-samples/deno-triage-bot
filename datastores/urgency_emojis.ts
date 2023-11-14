import { SlackAPIClient } from "deno-slack-api/types.ts";

type UrgencyEmojiItem = {
  name: string;
  urgency: number;
};

export default class UrgencyEmojisDatastore {
  private static readonly DATASTORE_NAME = "urgency_emojis";

  static getAll = async (
    client: SlackAPIClient,
  ): Promise<Array<UrgencyEmojiItem>> => {
    console.log(
      `querying urgency emojis from the datastore...`,
    );
    const ret = await client.apps.datastore.query({
      datastore: this.DATASTORE_NAME,
    });
    if (!ret.ok) throw new Error(ret.error);
    const urgencyEmojis = ret.items as UrgencyEmojiItem[];
    console.log(`Found ${urgencyEmojis.length} emojis in the datastore.`);
    return urgencyEmojis;
  };
}
