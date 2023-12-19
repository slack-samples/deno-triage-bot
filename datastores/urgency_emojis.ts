import { SlackAPIClient } from "deno-slack-api/types.ts";

type UrgencyEmojiItem = {
  emoji: string;
  urgency: number;
};

/*
Datastores for storing request emojis with their associated urgency levels.
A value of 0 signifies the highest urgency, while a value of 2 indicates the lowest urgency.

example data:
{
  "emoji": "red_circle",
  "urgency": "0",
}

To add an emoji, run the following slack cli:
slack datastore put '{"datastore": "done_emojis", "app": "your_app_id", "item": {"emoji": "your_emoji", "urgency": 1}}'

*/

export default class UrgencyEmojisDatastore {
  private static readonly DATASTORE_NAME = "urgency_emojis";

  static getAll = async (
    client: SlackAPIClient,
  ): Promise<{ [emoji: string]: number }> => {
    console.log(
      `querying urgency emojis from the datastore...`,
    );
    const ret = await client.apps.datastore.query({
      datastore: this.DATASTORE_NAME,
    });
    if (!ret.ok) throw new Error(ret.error);
    if (ret.items.length == 0) {
      return {};
    }
    const urgencyEmojis = ret.items as UrgencyEmojiItem[];
    console.log(`Found ${urgencyEmojis.length} emojis in the datastore.`);
    // Convert to a dictionary
    const urgencyEmojiDictionary: { [emoji: string]: number } = Object
      .fromEntries(
        urgencyEmojis.map((item) => [item.emoji, item.urgency]),
      );
    return urgencyEmojiDictionary;
  };
}
