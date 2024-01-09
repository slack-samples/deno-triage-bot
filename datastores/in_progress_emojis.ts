import { SlackAPIClient } from "deno-slack-api/types.ts";

type InProgressEmojiItem = {
  name: string;
};

/*
datastores for storing emojis indicating requests in progress

To add an emoji, run the following slack cli:
slack datastore put '{"datastore": "in_progress_emojis", "app": "your_app_id", "item": {"name": "your_emoji"}}'
*/

export default class InProgressEmojisDatastore {
  private static readonly DATASTORE_NAME = "in_progress_emojis";

  static getAll = async (client: SlackAPIClient): Promise<string[]> => {
    console.log(`querying in progress emojis from the datastore...`);

    const ret = await client.apps.datastore.query({
      datastore: this.DATASTORE_NAME,
    });

    if (!ret.ok) {
      throw new Error(ret.error || "Unknown error");
    }

    const inProgressEmojis = ret.items as InProgressEmojiItem[];
    console.log(`Found ${inProgressEmojis.length} emojis in the datastore.`);

    const emojis = inProgressEmojis.map(({ name }) => name);
    return emojis;
  };
}
