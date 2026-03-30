import { Policy, Role } from './types';

export const ROLE_DISTRIBUTION: Record<number, { fascists: number; hitler: 1; liberals: number }> = {
  5: { liberals: 3, fascists: 1, hitler: 1 },
  6: { liberals: 4, fascists: 1, hitler: 1 },
  7: { liberals: 4, fascists: 2, hitler: 1 },
  8: { liberals: 5, fascists: 2, hitler: 1 },
  9: { liberals: 5, fascists: 3, hitler: 1 },
  10: { liberals: 6, fascists: 3, hitler: 1 },
};

export const INITIAL_DECK: Policy[] = [
  ...Array(6).fill('Liberal'),
  ...Array(11).fill('Fascist'),
];

export const FASCIST_POWERS: Record<number, Record<number, string>> = {
  5: { 3: 'PolicyPeek', 4: 'Execution', 5: 'Execution' },
  6: { 3: 'PolicyPeek', 4: 'Execution', 5: 'Execution' },
  7: { 2: 'Investigate', 3: 'SpecialElection', 4: 'Execution', 5: 'Execution' },
  8: { 2: 'Investigate', 3: 'SpecialElection', 4: 'Execution', 5: 'Execution' },
  9: { 1: 'Investigate', 2: 'Investigate', 3: 'SpecialElection', 4: 'Execution', 5: 'Execution' },
  10: { 1: 'Investigate', 2: 'Investigate', 3: 'SpecialElection', 4: 'Execution', 5: 'Execution' },
};

export const CREDITS = {
  creators: ['Mike Boxleiter', 'Tommy Maranges', 'Max Temkin'],
  illustrator: 'Mac Schubert',
  license: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
};
