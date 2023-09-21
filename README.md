# Triagebot on Platform 2.0

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Create Triggers](#create-triggers)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### Create Triggers

Triggers are how users interact with Triagebot. Using the CLI, create triggers _once per workspace_ using the following command:

:warning: If you receive an error creating scheduled triggers, ensure the `start_time` is in the future.

```
for x in triggers/*.ts ; do slack triggers create -w $WORKSPACE --trigger-def $x; done
```

* `help_shortcut_trigger.ts` - Shortcut trigger to post a private help message in the current channel.
* `manage_configuration_shortcut_trigger.ts` - Shortcut trigger to manage channel configuration for scheduled posts and default lookback day
* `private_report_shortcut_trigger.ts` - Shortcut trigger enabling users to generate a private triage report for the current channel.
* `public_report_shortcut_trigger.ts` - Shortcut trigger enabling users to generate a public triage report for the current channel.
* `triage_by_days_shortcut_trigger.ts` - Shortcut trigger enabling users to to generate a private triage report for the current channel with a specific lookback day.
* `private_report_webhook_trigger.ts` - Used internally by triage_by_days_shortcut_trigger to programmatically send private posts.
* `private_report_scheduled_trigger.ts` - Scheduled trigger for posting private reports with hourly frequency. This trigger trips the `post_scheduled_messages_workflow` which queries the datastore for per-channel cron schedules, and sends posts scheduled for the current hour.
* `public_report_webhook_trigger.ts` - Used internally by scheduled triggers to programmatically send scheduled posts.



