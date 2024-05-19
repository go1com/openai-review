import * as core from '@actions/core';
import { Context } from '@actions/github/lib/context';

enum eventNameTypes {
  PULL_REQUEST = 'pull_request',
}
export const checkEventName = (
  context: Context,
  eventName: string,
): boolean => {
  if (context.eventName !== eventNameTypes.PULL_REQUEST) {
    core.setFailed(
      `This action only supports Pull Requests, ${eventName} events are not supported. ` +
        "Please submit an issue on this action's GitHub repo if you believe this in correct.",
    );
    return false;
  }

  return true;
};
