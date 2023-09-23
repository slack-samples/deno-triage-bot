import { SlackAPIClient } from "deno-slack-api/types.ts";

type WebhookItem = {
  name: string;
  url: string;
};

export default class WebhookDatastore {
  private static readonly DATASTORE_NAME = "webhook";

  static get = async (
    client: SlackAPIClient,
    name: string,
  ): Promise<WebhookItem> => {
    console.log(
      `Getting webhook ${name} from the datastore...`,
    );
    const ret = await client.apps.datastore.get({
      datastore: this.DATASTORE_NAME,
      id: name,
    });
    if (!ret.ok) throw new Error(ret.error);
    const webhook = ret.item as WebhookItem;
    return webhook;
  };
}
