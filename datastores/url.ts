import { SlackAPIClient } from "deno-slack-api/types.ts";

type UrlItem = {
  name: string;
  url: string;
};

export default class UrlDatastore {
  private static readonly DATASTORE_NAME = "url";

  static get = async (
    client: SlackAPIClient,
    name: string,
  ): Promise<string> => {
    console.log(
      `Getting ${name} URL from the datastore...`,
    );
    const ret = await client.apps.datastore.get({
      datastore: this.DATASTORE_NAME,
      id: name,
    });
    if (!ret.ok) throw new Error(ret.error);
    const datastoreItem = ret.item as UrlItem;
    return datastoreItem.url ??
      "It seems like you haven't saved the workflow link in the `url` datastore";
  };
}
