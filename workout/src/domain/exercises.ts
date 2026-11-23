import type { Exercise, MuscleGroup } from './types';

const img = (slug: string) => `exercises/${slug}.webp`;

/**
 * Bundled exercise library. Every entry has its own photo showing the movement and equipment.
 * Image sources and licences are listed in ASSETS.md.
 */
export const EXERCISES: Exercise[] = [
  {
    id: 'bench-press', name: 'Bench press', muscle: 'Chest', muscles: 'Chest, front shoulders, triceps',
    equipment: 'Barbell', mode: 'weighted', loadConvention: 'total', image: img('bench-press'),
    alt: 'Athlete lying on a flat bench pressing a loaded barbell above the chest',
    cues: ['Shoulder blades back and down.', 'Lower the bar to mid-chest.', 'Press up and slightly back.'],
  },
  {
    id: 'incline-dumbbell-press', name: 'Incline dumbbell press', muscle: 'Chest', muscles: 'Upper chest, front shoulders, triceps',
    equipment: 'Dumbbells', mode: 'weighted', loadConvention: 'perHand', image: img('incline-dumbbell-press'),
    alt: 'Athlete on an incline bench pressing two hex dumbbells overhead',
    cues: ['Bench at 30–45 degrees.', 'Elbows about 45 degrees from the torso.', 'Press the dumbbells up and together.'],
  },
  {
    id: 'seated-cable-row', name: 'Seated row', muscle: 'Back', muscles: 'Mid back, lats, rear shoulders',
    equipment: 'Cable', mode: 'weighted', loadConvention: 'total', image: img('seated-cable-row'),
    alt: 'Athlete seated at a cable row station pulling a close-grip handle toward the torso',
    cues: ['Sit tall.', 'Pull toward lower ribs.', 'Pause, then let the shoulders reach forward.'],
  },
  {
    id: 'lateral-raise', name: 'Lateral raise', muscle: 'Shoulders', muscles: 'Side shoulders',
    equipment: 'Dumbbells', mode: 'weighted', loadConvention: 'perHand', image: img('lateral-raise'),
    alt: 'Athlete standing and raising two dumbbells out to the sides to shoulder height',
    cues: ['Slight bend in the elbows.', 'Lead with the elbows to shoulder height.', 'Lower slowly.'],
  },
  {
    id: 'face-pull', name: 'Face pull', muscle: 'Shoulders', muscles: 'Rear shoulders, upper back',
    equipment: 'Cable', mode: 'weighted', loadConvention: 'total', image: img('face-pull'),
    alt: 'Athlete pulling a cable rope attachment toward the face with elbows high',
    cues: ['Set the pulley at upper-chest height.', 'Pull the rope toward your eyes.', 'Finish with hands beside the ears.'],
  },
  {
    id: 'overhead-press', name: 'Overhead press', muscle: 'Shoulders', muscles: 'Shoulders, triceps, upper back',
    equipment: 'Barbell', mode: 'weighted', loadConvention: 'total', image: img('overhead-press'),
    alt: 'Athlete standing and pressing a barbell straight overhead to locked arms',
    cues: ['Squeeze glutes and brace.', 'Press in a straight line past the face.', 'Lock out with biceps by the ears.'],
  },
  {
    id: 'lat-pulldown', name: 'Lat pulldown', muscle: 'Back', muscles: 'Lats, biceps',
    equipment: 'Cable', mode: 'weighted', loadConvention: 'total', image: img('lat-pulldown'),
    alt: 'Athlete seated at a lat pulldown machine pulling a wide bar down to the upper chest',
    cues: ['Grip just outside shoulder width.', 'Drive the elbows down to the ribs.', 'Control the bar back up.'],
  },
  {
    id: 'pull-up', name: 'Pull-up', muscle: 'Back', muscles: 'Lats, biceps, grip',
    equipment: 'Pull-up bar', mode: 'bodyweight', loadConvention: 'total', image: img('pull-up'),
    alt: 'Athlete hanging from a pull-up bar and pulling the chin above the bar',
    cues: ['Start from a dead hang.', 'Pull the chest toward the bar.', 'Lower all the way down.'],
  },
  {
    id: 'one-arm-dumbbell-row', name: 'One-arm dumbbell row', muscle: 'Back', muscles: 'Lats, mid back, biceps',
    equipment: 'Dumbbell', mode: 'weighted', loadConvention: 'perHand', image: img('one-arm-dumbbell-row'),
    alt: 'Athlete bracing one hand and knee on a flat bench while rowing a dumbbell to the hip',
    cues: ['Flat back, supported on the bench.', 'Row the dumbbell to the hip.', 'Log the dumbbell weight.'],
  },
  {
    id: 'dumbbell-curl', name: 'Dumbbell curl', muscle: 'Arms', muscles: 'Biceps',
    equipment: 'Dumbbells', mode: 'weighted', loadConvention: 'perHand', image: img('dumbbell-curl'),
    alt: 'Athlete standing and curling two dumbbells with palms facing up',
    cues: ['Elbows pinned to your sides.', 'Curl without swinging.', 'Lower under control.'],
  },
  {
    id: 'hammer-curl', name: 'Hammer curl', muscle: 'Arms', muscles: 'Biceps, forearms',
    equipment: 'Dumbbells', mode: 'weighted', loadConvention: 'perHand', image: img('hammer-curl'),
    alt: 'Athlete standing and curling dumbbells with a neutral, thumbs-up grip',
    cues: ['Thumbs up, neutral grip.', 'Keep wrists straight.', 'Squeeze at the top.'],
  },
  {
    id: 'triceps-pushdown', name: 'Triceps pushdown', muscle: 'Arms', muscles: 'Triceps',
    equipment: 'Cable', mode: 'weighted', loadConvention: 'total', image: img('triceps-pushdown'),
    alt: 'Athlete at a high cable pulley pushing a rope attachment down to straight arms',
    cues: ['Elbows fixed at your sides.', 'Push down and spread the rope.', 'Return until forearms are level.'],
  },
  {
    id: 'triceps-dip', name: 'Triceps dip', muscle: 'Arms', muscles: 'Triceps, chest, front shoulders',
    equipment: 'Dip bars', mode: 'bodyweight', loadConvention: 'total', image: img('triceps-dip'),
    alt: 'Athlete supporting the body on parallel dip bars, lowering with bent elbows',
    cues: ['Stay upright to bias the triceps.', 'Lower until elbows reach 90 degrees.', 'Press to straight arms.'],
  },
  {
    id: 'push-up', name: 'Push-up', muscle: 'Chest', muscles: 'Chest, triceps, core',
    equipment: 'Bodyweight', mode: 'bodyweight', loadConvention: 'total', image: img('push-up'),
    alt: 'Athlete in a push-up position on the gym floor with straight body line',
    cues: ['Hands under the shoulders.', 'Body in one straight line.', 'Chest to just above the floor.'],
  },
  {
    id: 'back-squat', name: 'Back squat', muscle: 'Legs', muscles: 'Quads, glutes, adductors',
    equipment: 'Barbell', mode: 'weighted', loadConvention: 'total', image: img('back-squat'),
    alt: 'Athlete in a squat rack squatting with a barbell across the upper back',
    cues: ['Brace before each rep.', 'Knees track over the toes.', 'Drive up through the mid-foot.'],
  },
  {
    id: 'romanian-deadlift', name: 'Romanian deadlift', muscle: 'Legs', muscles: 'Hamstrings, glutes, lower back',
    equipment: 'Barbell', mode: 'weighted', loadConvention: 'total', image: img('romanian-deadlift'),
    alt: 'Athlete hinging at the hips with soft knees, lowering a barbell along the thighs',
    cues: ['Soft knees, push the hips back.', 'Bar stays close to the legs.', 'Stop when hamstrings are stretched.'],
  },
  {
    id: 'deadlift', name: 'Deadlift', muscle: 'Legs', muscles: 'Glutes, hamstrings, back',
    equipment: 'Barbell', mode: 'weighted', loadConvention: 'total', image: img('deadlift'),
    alt: 'Athlete set up over a loaded barbell on the floor, gripping it to deadlift',
    cues: ['Bar over mid-foot.', 'Pull the slack out, chest up.', 'Push the floor away and stand tall.'],
  },
  {
    id: 'dumbbell-lunge', name: 'Dumbbell lunge', muscle: 'Legs', muscles: 'Quads, glutes',
    equipment: 'Dumbbells', mode: 'weighted', loadConvention: 'perHand', image: img('dumbbell-lunge'),
    alt: 'Athlete stepping into a lunge holding a dumbbell in each hand',
    cues: ['Long step, upright torso.', 'Back knee toward the floor.', 'Push through the front heel.'],
  },
  {
    id: 'split-squat', name: 'Split squat', muscle: 'Legs', muscles: 'Quads, glutes',
    equipment: 'Dumbbells', mode: 'weighted', loadConvention: 'perHand', image: img('split-squat'),
    alt: 'Athlete in a staggered split stance holding dumbbells at the sides',
    cues: ['Stay tall through the torso.', 'Lower straight down.', 'Finish all reps, then switch legs.'],
  },
  {
    id: 'goblet-squat', name: 'Goblet squat', muscle: 'Legs', muscles: 'Quads, glutes, core',
    equipment: 'Kettlebell', mode: 'weighted', loadConvention: 'total', image: img('goblet-squat'),
    alt: 'Athlete squatting deeply while holding a kettlebell at the chest',
    cues: ['Hold the bell close to the chest.', 'Sit between the heels.', 'Elbows inside the knees at the bottom.'],
  },
  {
    id: 'leg-press', name: 'Leg press', muscle: 'Legs', muscles: 'Quads, glutes',
    equipment: 'Machine', mode: 'weighted', loadConvention: 'total', image: img('leg-press'),
    alt: 'Athlete on an angled leg press machine pushing a loaded sled with both feet',
    cues: ['Feet shoulder-width on the platform.', 'Lower until hips start to tuck.', 'Do not lock the knees hard.'],
  },
  {
    id: 'lying-leg-curl', name: 'Lying leg curl', muscle: 'Legs', muscles: 'Hamstrings',
    equipment: 'Machine', mode: 'weighted', loadConvention: 'total', image: img('lying-leg-curl'),
    alt: 'Athlete lying face down on a leg curl machine curling the pad toward the glutes',
    cues: ['Hips pressed into the pad.', 'Curl the heels to the glutes.', 'Lower slowly.'],
  },
  {
    id: 'standing-calf-raise', name: 'Standing calf raise', muscle: 'Legs', muscles: 'Calves',
    equipment: 'Machine', mode: 'weighted', loadConvention: 'total', image: img('standing-calf-raise'),
    alt: 'Athlete under the shoulder pads of a standing calf raise machine rising onto the toes',
    cues: ['Full stretch at the bottom.', 'Rise high onto the big toe.', 'Pause at the top.'],
  },
  {
    id: 'hip-thrust', name: 'Hip thrust', muscle: 'Legs', muscles: 'Glutes, hamstrings',
    equipment: 'Barbell', mode: 'weighted', loadConvention: 'total', image: img('hip-thrust'),
    alt: 'Athlete with upper back on a bench driving a padded barbell up with the hips',
    cues: ['Upper back on the bench edge.', 'Chin tucked, ribs down.', 'Squeeze the glutes at the top.'],
  },
  {
    id: 'plank', name: 'Plank', muscle: 'Core', muscles: 'Abdominals, deep core',
    equipment: 'Bodyweight', mode: 'timed', loadConvention: 'total', image: img('plank'),
    alt: 'Athlete holding a forearm plank on the floor with a straight body line',
    cues: ['Elbows under the shoulders.', 'Squeeze glutes, ribs down.', 'Breathe and hold.'],
  },
  {
    id: 'side-plank', name: 'Side plank', muscle: 'Core', muscles: 'Obliques, deep core',
    equipment: 'Bodyweight', mode: 'timed', loadConvention: 'total', image: img('side-plank'),
    alt: 'Athlete lying on one side, propped on a forearm, setting up a side plank',
    cues: ['Elbow under the shoulder.', 'Lift the hips into a straight line.', 'Hold each side for the same time.'],
  },
  {
    id: 'dead-bug', name: 'Dead bug', muscle: 'Core', muscles: 'Abdominals, deep core',
    equipment: 'Bodyweight', mode: 'bodyweight', loadConvention: 'total', image: img('dead-bug'),
    alt: 'Athlete lying on the back with arms reaching up and knees bent at 90 degrees',
    cues: ['Lower back pressed into the floor.', 'Extend opposite arm and leg.', 'Move slowly and breathe out.'],
  },
  {
    id: 'hanging-leg-raise', name: 'Hanging leg raise', muscle: 'Core', muscles: 'Abdominals, hip flexors',
    equipment: 'Pull-up bar', mode: 'bodyweight', loadConvention: 'total', image: img('hanging-leg-raise'),
    alt: 'Athlete hanging from a bar and raising the knees toward the chest',
    cues: ['Hang with shoulders engaged.', 'Curl the pelvis up.', 'Avoid swinging.'],
  },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const e = EXERCISE_BY_ID[id];
  if (!e) throw new Error(`Unknown exercise ${id}`);
  return e;
}

export const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];

export function searchExercises(query: string, muscle: MuscleGroup | 'All'): Exercise[] {
  const q = query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return EXERCISES.filter((e) => {
    if (muscle !== 'All' && e.muscle !== muscle) return false;
    if (!words.length) return true;
    const hay = `${e.name} ${e.equipment} ${e.muscle} ${e.muscles} ${e.mode === 'timed' ? 'timed hold' : ''} ${e.mode === 'bodyweight' ? 'bodyweight' : ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

export function equipmentLabel(e: Exercise): string {
  return e.equipment;
}
