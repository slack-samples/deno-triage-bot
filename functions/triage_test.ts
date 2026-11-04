import { assertEquals } from "@std/assert";

import { getMentions, request_message_format_for_summary } from "./triage.ts";

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

Deno.test("request_message_format_for_summary: should @ mention people in ephemeral messages", () => {
  const result = request_message_format_for_summary(
    "Hello <@ABC123>",
    {},
    false,
  );

  assertEquals(result, "Hello <@ABC123>");
});

Deno.test("request_message_format_for_summary: should not @ mention people in public messages", () => {
  const result = request_message_format_for_summary(
    "Hello <@ABC123>",
    {},
    true,
  );

  assertEquals(result, "Hello \u200B<@\u200BABC123>");
});

Deno.test("request_message_format_for_summary: should remove emojis", () => {
  const result = request_message_format_for_summary(
    ":blue-circle: Hello <@ABC123>",
    { ":blue-circle:": 0 },
    false,
  );

  assertEquals(result, "Hello <@ABC123>");
});

Deno.test("request_message_format_for_summary: should truncate without splitting mrkdwn", () => {
  const tests = [
    // Link
    {
      actual:
        ":blue-circle: Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com/archives/C09K23K0U/p1738777064854469> that needs your support: <https://slack-ce.slack.com/archives/C09K23K0U/p1738777064854469>",
      expected:
        "Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com/archives/C09K23K0U/p17387770...>",
    },
    // Channel
    {
      actual:
        ":blue-circle: Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com> that really, really needs <#C09K23K0U|>",
      expected:
        "Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com> that really, really needs...",
    },
    // User
    {
      actual:
        ":blue-circle: Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com> that really, really needs <@U09K23K0U>",
      expected:
        "Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com> that really, really needs...",
    },
    // Bare link
    {
      actual: `:blue-circle: ${
        "x".repeat(70)
      } <https://github.com/slack-samples/deno-triage-bot/pull/50>`,
      expected: `${
        "x".repeat(70)
      } <https://github.com/slack-samples/deno-triage-bot/pull/50|https://g...>`,
    },
    // Plain text
    {
      actual: `:blue-circle: ${"y".repeat(100)}`,
      expected: `${"y".repeat(80)}...`,
    },
  ];

  for (const test of tests) {
    const result = request_message_format_for_summary(
      test.actual,
      { ":blue-circle:": 0 },
      false,
    );

    assertEquals(result, test.expected);
  }
});

Deno.test("request_message_format_for_summary: should preseve channels, users and links if it can", () => {
  const tests = [
    // Link
    {
      actual:
        ":blue-circle: <mylink|https://slack-ce.slack.com/archives/C09K23K0U/p1738777064854469>",
      expected:
        "<mylink|https://slack-ce.slack.com/archives/C09K23K0U/p1738777064854469>",
    },
    // Channel
    {
      actual: ":blue-circle: <#C09K23K0U|> <#C09K23K0U>",
      expected: "<#C09K23K0U|> <#C09K23K0U>",
    },
    // User
    {
      actual: ":blue-circle: <@U09K23K0U>",
      expected: "<@U09K23K0U>",
    },
  ];

  for (const test of tests) {
    const result = request_message_format_for_summary(
      test.actual,
      { ":blue-circle:": 0 },
      false,
    );

    assertEquals(result, test.expected);
  }
});

Deno.test("request_message_format_for_summary: should keep the link to a PR whole", () => {
  const result = request_message_format_for_summary(
    ":large_blue_circle: *Pull request ready for review* — <https://github.com/slack-samples/deno-triage-bot/pull/50|slack-samples/deno-triage-bot#50> :eyes: <!subteam^S0123456789|@reviewers> please review",
    { ":large_blue_circle:": 1 },
    false,
  );

  assertEquals(
    result,
    "*Pull request ready for review* — <https://github.com/slack-samples/deno-triage-bot/pull/50|slack-samples/deno-triage-bot#50> :eyes:...",
  );
});

Deno.test("request_message_format_for_summary: should not @ mention people in truncated public messages", () => {
  const result = request_message_format_for_summary(
    `:blue-circle: ${"z".repeat(60)} <@U09K23K0U> <@U09K23K0U>`,
    { ":blue-circle:": 0 },
    true,
  );

  assertEquals(result, `${"z".repeat(60)} \u200B<@\u200BU09K23K0U>...`);
});
