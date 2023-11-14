import { SlackAPIClient } from "deno-slack-api/types.ts";

type InProgressEmojiItem = {
  name: string;
};

export default class InProgressEmojisDatastore {
  private static readonly DATASTORE_NAME = "in_progress_emojis";

  static getAll = async (
    client: SlackAPIClient,
  ): Promise<Array<InProgressEmojiItem>> => {
    console.log(
      `querying in progress emojis from the datastore...`,
    );
    const ret = await client.apps.datastore.query({
      datastore: this.DATASTORE_NAME,
    });
    if (!ret.ok) throw new Error(ret.error);
    const inProgressEmojis = ret.items as InProgressEmojiItem[];
    console.log(`Found ${inProgressEmojis.length} emojis in the datastore.`);
    return inProgressEmojis;
  };
}
