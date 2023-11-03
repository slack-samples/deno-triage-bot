import { assertEquals } from "testing/asserts.ts";
import {
  adjustUTC,
  isValidSchedule,
  shouldRun,
} from "./post_scheduled_messages.ts";

Deno.test("Return false when input is incorrect", () => {
  const isValid = isValidSchedule("*");
  assertEquals(isValid, false);
});

Deno.test("Return false when day of month is specified", () => {
  const isValid = isValidSchedule("* * 1 * *");
  assertEquals(isValid, false);
});

Deno.test("Return false when month is specified", () => {
  const isValid = isValidSchedule("* * * 5 *");
  assertEquals(isValid, false);
});

Deno.test("Return true when minute is specified", () => {
  const isValid = isValidSchedule("30 * * * *");
  assertEquals(isValid, true);
});

Deno.test("Return true when hour is specified", () => {
  const isValid = isValidSchedule("0 2 * * *");
  assertEquals(isValid, true);
});

Deno.test("Return true when day of week is specified", () => {
  const isValid = isValidSchedule("0 2 * * 3");
  assertEquals(isValid, true);
});

Deno.test("Return true when range of day is specified", () => {
  const isValid = isValidSchedule("0 2 * * 3-5");
  assertEquals(isValid, true);
});

Deno.test("Return true when multiple hours is specified", () => {
  const isValid = isValidSchedule("0 9,13,18,23 * * 1-4");
  assertEquals(isValid, true);
});

Deno.test("shouldRun returns true when the day and hour match the cron expression", () => {
  const date = new Date("08 Jul 2022 00:00:00 PDT"); // Friday
  const cron_expression = ["* 0 * * 5"]; // Friday at 00:00:00 GMT
  const should_run = shouldRun(date, cron_expression);
  assertEquals(should_run, true);
});

Deno.test("shouldRun returns true when the day and hour match the cron expression with a range", () => {
  const date = new Date("08 Jul 2022 00:00:00 PDT"); // Friday
  const cron_expression = ["* 0-3 * * 5-7"]; // Friday at 00:00:00 GMT
  const should_run = shouldRun(date, cron_expression);
  assertEquals(should_run, true);
});

Deno.test("shouldRun returns true when the day and hour match the cron expression with specific hourly repetition", () => {
  const date = new Date("08 Jul 2022 00:00:00 PDT"); // Friday
  const cron_expression = ["* 0/8 * * 5"]; // Friday at 00:00:00 GMT
  const should_run = shouldRun(date, cron_expression);
  assertEquals(should_run, true);
});

Deno.test("shouldRun returns false when the day and hour do not match the cron expression", () => {
  const date = new Date("07 Jul 2022 00:00:00 PDT"); // Friday
  const cron_expression = ["* 0 * * 5"]; // Friday at 00:00:00 GMT
  const should_run = shouldRun(date, cron_expression);
  assertEquals(should_run, false);
});

Deno.test("shouldRun returns false when the day and hour do not match the cron expression with a range", () => {
  const date = new Date("09 Jul 2022 04:00:00 PDT"); // Friday
  const cron_expression = ["* 0-3 * * 5-7"]; // Friday at 00:00:00 GMT
  const should_run = shouldRun(date, cron_expression);
  assertEquals(should_run, false);
});

Deno.test("shouldRun returns false when the day and hour do not match the cron expression with specific hourly repetition", () => {
  const date = new Date("08 Jul 2022 01:00:00 GMT"); // Friday
  const cron_expression = ["* 0/8 * * 5"]; // Friday at 00:00:00 GMT
  const should_run = shouldRun(date, cron_expression);
  assertEquals(should_run, false);
});

Deno.test("shouldRun returns true when one of the cron matches criteria", () => {
  const date = new Date("08 Jul 2022 00:30:00 GMT"); // Friday
  const cron_expression = ["* 2 * * *", "30 * * * *", "* 0/8 * * 5"]; // Friday at 00:00:00 GMT
  const should_run = shouldRun(date, cron_expression);
  assertEquals(should_run, true);
});

Deno.test("shouldRun returns false when all crons fail to match criteria", () => {
  const date = new Date("08 Jul 2022 00:30:00 GMT"); // Friday
  const cron_expression = ["* 2 * * *", "* 0/8 * * 5"]; // Friday at 00:00:00 GMT
  const should_run = shouldRun(date, cron_expression);
  assertEquals(should_run, false);
});

Deno.test("timezone conversion", () => {
  const time = new Date("08 Jul 2022 07:00:00 UTC");
  const adjustedUTC = adjustUTC(time, "America/Los_Angeles");
  const expectedAdjustedUTC = new Date("08 Jul 2022 00:00:00 UTC");
  // UTC is adjusted by decreasing 7 hours
  assertEquals(adjustedUTC, expectedAdjustedUTC);
});
