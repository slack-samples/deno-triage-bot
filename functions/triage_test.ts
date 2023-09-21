import { assertEquals } from "testing/asserts.ts";
import { getMentions } from "./triage.ts";

Deno.test("Epoch to human readable date test", () => {
  const mentions = getMentions("No one is here to help");
  assertEquals(mentions, []);
});

Deno.test("getMentions matches a mention", () => {
  const mentions = getMentions("<@ABC123> is here to help");
  assertEquals(mentions, ["<@ABC123>"]);
});

Deno.test("getMentions matches multiple mentions", () => {
  const mentions = getMentions("<@ABC123|frodo> <@XYZ123> are here to help");
  assertEquals(mentions, ["<@frodo>", "<@XYZ123>"]);
});
