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

Deno.test("request_message_format_for_summary: should truncate visible text without splitting links, channels, or users", () => {
  const tests = [
    // Link
    {
      actual:
        ":blue-circle: Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com/archives/C09K23K0U/p1738777064854469> that needs your support: <https://slack-ce.slack.com/archives/C09K23K0U/p1738777064854469>",
      expected:
        "Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com/archives/C09K23K0U/p1738777064854469> t...",
    },
    // Link label
    {
      actual: `:blue-circle: ${
        "x".repeat(75)
      } <https://slack-ce.slack.com/archives/C09K23K0U|PR #51> today`,
      expected: `${
        "x".repeat(75)
      } <https://slack-ce.slack.com/archives/C09K23K0U|PR #...>`,
    },
    // Channel
    {
      actual:
        ":blue-circle: Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com> that really, really, really needs <#C09K23K0U|general>",
      expected:
        "Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com> that really, really, really needs...",
    },
    // User
    {
      actual:
        ":blue-circle: Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com> that really, really, really needs <@U09K23K0U>",
      expected:
        "Issue in <#C09K23K0U|> from <mylink|https://slack-ce.slack.com> that really, really, really needs...",
    },
    // Text
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

Deno.test("request_message_format_for_summary: should not count link URLs toward the limit", () => {
  const message =
    "Seeing errors on <https://slack-ce.slack.com/archives/C09K23K0U/p1738777064854469|this thread>, can someone help?";
  const result = request_message_format_for_summary(
    `:blue-circle: ${message}`,
    { ":blue-circle:": 0 },
    false,
  );

  assertEquals(result, message);
});

Deno.test("request_message_format_for_summary: should keep the URL of a bare link longer than the limit", () => {
  const url =
    "https://slack-ce.slack.com/archives/C09K23K0U/p1738777064854469?thread_ts=1738777064.854469";
  const result = request_message_format_for_summary(
    `:blue-circle: <${url}>`,
    { ":blue-circle:": 0 },
    false,
  );

  assertEquals(result, `<${url}|${url.slice(0, 80)}...>`);
});

Deno.test("request_message_format_for_summary: should not @ mention people in truncated public messages", () => {
  const result = request_message_format_for_summary(
    `:blue-circle: ${"z".repeat(50)} <@U09K23K0U> ${"y".repeat(40)}`,
    { ":blue-circle:": 0 },
    true,
  );

  assertEquals(
    result,
    `${"z".repeat(50)} \u200B<@\u200BU09K23K0U> ${"y".repeat(18)}...`,
  );
});
