/**
 * Pet shown for each difficulty level. Names match the difficulty picker
 * (DifficultySelectionModal); images match the game-end screen.
 */
export interface PetInfo {
  name: string;
  image: number;
}

/** Difficulty label per level (mirrors the game-end screen). */
export const DIFFICULTY_NAMES: Record<number, string> = {
  1: 'Tutorial',
  2: 'Easy',
  3: 'Simple',
  4: 'Normal',
  5: 'Medium',
  6: 'Hard',
  7: 'Challenging',
  8: 'Expert',
  9: 'Difficult',
  10: 'Master',
  11: 'Extreme',
  12: 'Insane',
  13: 'Brutal',
  14: 'Nightmare',
  15: 'Hell',
  16: 'Impossible',
};

export const getDifficultyName = (level: number | null | undefined): string =>
  DIFFICULTY_NAMES[level ?? 1] ?? 'Unknown';

export const PETS_BY_LEVEL: Record<number, PetInfo> = {
  1: { name: 'Pet Rock', image: require('../../assets/images/doggs/rock.png') },
  2: {
    name: 'Peg the Pug',
    image: require('../../assets/images/doggs/pug.png'),
  },
  3: {
    name: 'Hamster',
    image: require('../../assets/images/doggs/hamster.png'),
  },
  4: {
    name: 'Brussels Griffon',
    image: require('../../assets/images/doggs/brussleGriffon.png'),
  },
  5: {
    name: 'Clownfish',
    image: require('../../assets/images/doggs/clownfish.png'),
  },
  6: { name: 'Evee Cat', image: require('../../assets/images/doggs/evee.png') },
  7: {
    name: 'Chicken',
    image: require('../../assets/images/doggs/chicken.png'),
  },
  8: {
    name: 'Byul Terrier',
    image: require('../../assets/images/doggs/byul.png'),
  },
  9: { name: 'Parrot', image: require('../../assets/images/doggs/parrot.png') },
  10: {
    name: 'Cane Corso',
    image: require('../../assets/images/doggs/caneCorso.png'),
  },
  11: {
    name: 'Bearded Dragon',
    image: require('../../assets/images/doggs/beardedDragon.png'),
  },
  12: {
    name: 'Pitbull',
    image: require('../../assets/images/doggs/pitbull.png'),
  },
  13: {
    name: 'Horse',
    image: require('../../assets/images/doggs/petHorse.png'),
  },
  14: {
    name: 'Afghan Hound',
    image: require('../../assets/images/doggs/afghan.png'),
  },
  15: {
    name: 'German Shepherd',
    image: require('../../assets/images/doggs/germanShepard.png'),
  },
  16: {
    name: 'Dragon',
    image: require('../../assets/images/doggs/dragon.png'),
  },
};

export const getPetForLevel = (level: number | null | undefined): PetInfo =>
  PETS_BY_LEVEL[level ?? 1] ?? PETS_BY_LEVEL[1];
