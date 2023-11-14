import { SlackAPIClient } from "deno-slack-api/types.ts";

type DoneEmojiItem = {
  name: string;
};

export default class DoneEmojisDatastore {
  private static readonly DATASTORE_NAME = "done_emojis";

  static getAll = async (
    client: SlackAPIClient,
  ): Promise<Array<DoneEmojiItem>> => {
    console.log(
      `querying done emojis from the datastore...`,
    );
    const ret = await client.apps.datastore.query({
      datastore: this.DATASTORE_NAME,
    });
    if (!ret.ok) throw new Error(ret.error);
    const doneEmojis = ret.items as DoneEmojiItem[];
    console.log(`Found ${doneEmojis.length} emojis in the datastore.`);
    return doneEmojis;
  };
}
