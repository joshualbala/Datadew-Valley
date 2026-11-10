import type { Illustration } from './common';
import { construction } from './construction';
import { dataCenterOpens } from './dataCenterOpens';
import { townMeeting } from './townMeeting';
import { valleyHome } from './valleyHome';

export { PICTURE_H, PICTURE_W, gridOf, type Illustration, type IllustrationStage } from './common';

/**
 * Built-in slide pictures, referenced by name from content/sequences/*.json
 * ("illustration": "valley-home"). To add one: create <name>.ts exporting an
 * Illustration (see valleyHome.ts), then add it here.
 */
export const illustrations: Record<string, Illustration> = {
  'valley-home': valleyHome,
  'town-meeting': townMeeting,
  construction,
  'data-center-opens': dataCenterOpens,
};
