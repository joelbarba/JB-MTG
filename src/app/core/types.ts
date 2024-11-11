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
};

export type TCardLocation = 'off' | 'stack'
  | 'deck1' | 'hand1' | 'tble1' | 'grav1'
  | 'deck2' | 'hand2' | 'tble2' | 'grav2';
export type TCardSemiLocation = 'off' | 'deck' | 'hand' | 'tble' | 'grav';
export type TCardAnyLocation = TCardSemiLocation & TCardSemiLocation;

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
  selectableAction?: null | TGameOption;
  selectableTarget?: null | { text: string, value: string };
  targets?: Array<string>;
  damage?: number;
}
export type TGameCards = Array<TGameCard>;
export type TExtGameCard = TGameCard & {
  posX: number;
  posY: number;
  zInd: number;
}


export type TPlayer = {
  userId: string;
  name: string;
  num: '1' | '2';
  help: string;
  life: number;
  manaPool: TCast;
  drawnCards: number;  // Only 1 per turn
  summonedLands: number;  // Only 1 per turn
  controlTime: number;
  stackCall: boolean;  // true if the spell-stack needs to stop on the player
  selectableAction?: null | TGameOption;
  selectableTarget?: null | { text: string, value: string };
  aaa: any;
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
| 'cancel-instant-spell'
| 'select-attacking-creature'
| 'cancel-attack'
| 'submit-attack'
| 'select-defending-creature'
| 'cancel-defense'
| 'submit-defense'
| 'end-combat'
| 'release-stack'
| 'end-interrupting'
;

export type TActionParams = { 
  gId?: string;
  manaForUncolor?: TCast,
  targets?: Array<string> 
}