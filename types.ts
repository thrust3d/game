export type Role = 'Liberal' | 'Fascist' | 'Hitler';
export type Policy = 'Liberal' | 'Fascist';
export type GamePhase = 'Setup' | 'RoleReveal' | 'Election' | 'Legislative' | 'ExecutiveAction' | 'GameOver';
export type ExecutivePower = 'Investigate' | 'SpecialElection' | 'PolicyPeek' | 'Execution' | 'None';

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  isInvestigated: boolean;
}

export interface GameState {
  players: Player[];
  phase: GamePhase;
  liberalPolicies: number;
  fascistPolicies: number;
  electionTracker: number;
  deck: Policy[];
  discard: Policy[];
  presidentIdx: number;
  chancellorIdx: number | null;
  nominatedChancellorIdx: number | null;
  lastPresidentIdx: number | null;
  lastChancellorIdx: number | null;
  drawnPolicies: Policy[];
  activeExecutivePower: ExecutivePower;
  winner: 'Liberals' | 'Fascists' | null;
  logs: string[];
}
