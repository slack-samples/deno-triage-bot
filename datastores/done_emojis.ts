import { SlackAPIClient } from "deno-slack-api/types.ts";

type DoneEmojiItem = {
  name: string;
};

/*
datastores for storing emojis indicating requests are done

To add an emoji, run the following slack cli:
slack datastore put '{"datastore": "done_emojis", "app": "your_app_id", "item": {"name": "your_emoji"}}'
*/

export default class DoneEmojisDatastore {
  private static readonly DATASTORE_NAME = "done_emojis";

  static getAll = async (client: SlackAPIClient): Promise<string[]> => {
    console.log(`querying done emojis from the datastore...`);

    const ret = await client.apps.datastore.query({
      datastore: this.DATASTORE_NAME,
    });

    if (!ret.ok) {
      throw new Error(ret.error || "Unknown error");
    }

    const doneEmojis = ret.items as DoneEmojiItem[];
    console.log(`Found ${doneEmojis.length} emojis in the datastore.`);

    const emojis = doneEmojis.map(({ name }) => name);
    return emojis;
  };
}
