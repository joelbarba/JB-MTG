export type TColor = 'uncolored' | 'blue' | 'white' | 'black' | 'red' | 'green';
export type TCast = [number, number, number, number, number, number];
export type TCardType = 'land' | 'creature' | 'instant' | 'interruption' | 'artifact' | 'sorcery' | 'enchantment';

export enum EPhase {
  untap       = 'untap',
  maintenance = 'maintenance',
  draw        = 'draw',
  pre         = 'pre',
  combat      = 'combat',
  post        = 'post',
  discard     = 'discard',
  end         = 'end'
}
export enum ESubPhase {
  selectAttack   = 'selectAttack', 
  attacking      = 'attacking', 
  selectDefense  = 'selectDefense', 
  defending      = 'defending', 
  afterCombat    = 'afterCombat',
}

export type TCard = {
  id      : string; // C000000
  cast    : TCast;
  color   : TColor;
  name    : string;
  image   : string;
  text    : string;
  type    : TCardType;
  attack  : number;
  defense : number;
  readyToPlay: boolean;
};

export type TCardLocation = 'off' | 'stack'
  | 'deck1' | 'hand1' | 'tble1' | 'grav1'
  | 'deck2' | 'hand2' | 'tble2' | 'grav2';
export type TCardSemiLocation = 'off' | 'deck' | 'hand' | 'tble' | 'grav';
export type TCardAnyLocation = TCardLocation | TCardSemiLocation;

export type TTargetType = {
  player?: 'A' | 'B';       // If provided, the selected target must be player A or B
  cardType?: TCardType;     // If provided, the selected target must be of this type
  location?: TCardAnyLocation; // If provided, the selected target must be of this location
}

export type TEffect = {
  id: string; // Id of the effect
  gId: string; // gId of the card that generated the effect
  scope: 'permanent' | 'turn';
  targets: Array<string>; // Array of gIds or player1 or player2
}

export type TGameDBState = {
  created: string;
  status: 'created' | 'playing' | 'player1win' | 'player2win' | 'error';
  turn: '1' | '2';
  control: '1' | '2';
  phase: EPhase;
  subPhase: ESubPhase | null;
  player1: TPlayer;
  player2: TPlayer;
  cards: Array<TGameCard>;
  effects: Array<TEffect>;
  lastAction?: TGameOption & { time: string, player: '1' | '2' };
  id: number; // sequential order
}
export type TGameState = TGameDBState & { options: Array<TGameOption> };
export type TGameHistory = TGameState & { history: Array<TGameOption & { time: string, player: '1' | '2' }>; }

export type TGameCard = TCard & {
  gId: string;
  owner: '1' | '2';       // player 1 | player 2
  controller: '1' | '2';  // player 1 | player 2
  order: number;
  location: TCardLocation;
  isTapped: boolean;
  status: null | 'summon:waitingMana' | 'summon:selectingMana' | 'summon:selectingTargets' | 'summoning' | 'sickness'
               | 'combat:attacking' | 'combat:defending' | 'combat:selectingTarget';

  targets: Array<string>;         // Aarray of gIds, playerA, playerB
  possibleTargets: Array<string>; // Aarray of gIds, playerA, playerB (of the possible targets to be selected at that moment)
  neededTargets: number;          // Minimum number of targets to complete the summoinng

  blockingTarget: string | null;  // For combat: When defending, the gId of the attacking creature this one is blocking

  turnDamage: number;
  turnAttack: number;  // <-- attack + effects
  turnDefense: number; // <-- defense + effects

  // Not in DB (calculated when options)
  selectableAction?: null | TGameOption;
  selectableTarget?: null | { text: string, value: string };
  effectsFrom?: Array<TEffect>;
  targetOf?: Array<TGameCard>;
  uniqueTargetOf?: Array<TGameCard>;
}
export type TGameCards = Array<TGameCard>;
export type TExtGameCard = TGameCard & {
  posX: number;
  posY: number;
  zInd: number;
  grid: 'A' | 'B';
}


export type TPlayer = {
  userId: string;
  name: string;
  num: '1' | '2';
  life: number;
  manaPool: TCast;
  drawnCards: number;  // Only 1 per turn
  summonedLands: number;  // Only 1 per turn
  stackCall: boolean;  // true if the spell-stack needs to stop on the player
  selectableAction?: null | TGameOption;
  selectableTarget?: null | { text: string, value: string };
}

export type TGameOption = { action: TAction, params: TActionParams, text?: string };

export type TAction = 'start-game' 
| 'refresh'
| 'skip-phase'
| 'untap-card'
| 'untap-all'
| 'draw' 
| 'summon-land' 
| 'summon-creature'
| 'summon-spell'
| 'cancel-summon'
| 'select-card-to-discard' 
| 'tap-land'
| 'burn-mana'
| 'select-attacking-creature'
| 'cancel-attack'
| 'submit-attack'
| 'select-defending-creature'
| 'cancel-defense'
| 'submit-defense'
| 'release-stack'
;

export type TActionParams = { 
  gId?: string;
  manaForUncolor?: TCast,
  targets?: Array<string> 
}