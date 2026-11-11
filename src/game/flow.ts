import type Phaser from 'phaser';
import type { FlowStep } from '../content/schemas';
import { getContent } from '../content/store';
import { progress } from '../state/progress';

type StepOf<T extends FlowStep['type']> = Extract<FlowStep, { type: T }>;
type StepHandler<T extends FlowStep['type']> = (scene: Phaser.Scene, step: StepOf<T>) => void;

/**
 * What each flow step type does. To add a step type: add its schema in
 * content/schemas.ts (FlowStepSchema), then add a handler here. Usually a
 * handler just starts a scene with the step as data; that scene calls
 * flow.next(this) when it is finished.
 */
const handlers: { [T in FlowStep['type']]: StepHandler<T> } = {
  sequence: (scene, step) => scene.scene.start('Sequence', { sequence: step.sequence }),
  card: (scene, step) => scene.scene.start('Card', step),
  map: (scene, step) => scene.scene.start('Map', { map: step.map, popup: step.popup, until: step.until }),
};

let index = -1;

/** Runs the steps in public/content/flow.json, one after another. */
export const flow = {
  /** Start from the first step (called by the title screen). */
  start(scene: Phaser.Scene): void {
    index = -1;
    flow.next(scene);
  },

  /** Leave the current step and run the next one. */
  next(scene: Phaser.Scene): void {
    index += 1;
    const step = getContent().flow.steps[index];
    if (!step) {
      // The playthrough is over: clear progress so the next person starts fresh, and go back to the title.
      progress.reset();
      scene.scene.start('Title');
      return;
    }
    (handlers[step.type] as StepHandler<FlowStep['type']>)(scene, step);
  },
};
