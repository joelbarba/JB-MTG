export type TColor = 'uncolored' | 'blue' | 'black' | 'white' | 'red' | 'green';
export type TCast = [number, number, number, number, number, number];
export type TCardType = 'land' | 'creature' | 'instant' | 'artifact';

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

export type TCardLocation = 'off'
  | 'deck1' | 'hand1' | 'tble1' | 'grav1'
  | 'deck2' | 'hand2' | 'tble2' | 'grav2';
export type TCardSemiLocation = 'off' | 'deck' | 'hand' | 'tble' | 'grav';
export type TCardAnyLocation = TCardSemiLocation & TCardSemiLocation;

export type TGameCard = TCard & {
  gId: string;
  owner: '1' | '2';       // player 1 | player 2
  controller: '1' | '2';  // player 1 | player 2
  order: number;
  location: TCardLocation;
  isTapped: boolean;
  summonStatus: null | 'waitingMana' | 'selectingMana' | 'summoning' | 'sickness';
  summonTime: number,
  selectableAction: null | { text: string; action: TAction };
}
export type TGameCards = Array<TGameCard>;
export type TExtGameCard = TGameCard & {
  posX: number;
  posY: number;
  zInd: number;
  isSelectable?: boolean;
}

export type TPlayer = {
  userId: string;
  name: string;
  help: string;
  life: number;
  manaPool: TCast;
  drawnCards: number;  // Only 1 per turn
  summonedLands: number;  // Only 1 per turn
}

export type TGameState = {
  created: string;
  status: 'created' | 'playing' | 'player1win' | 'player2win' | 'error';
  turn: '1' | '2';
  phase: EPhase;
  player1: TPlayer;
  player2: TPlayer;
  cards: Array<TGameCard>;
  options: Array<TGameOption>;
}

export type TAction = 'start-game' 
| 'skip-phase'
| 'untap-card'
| 'draw' 
| 'summon-land' 
| 'tap-land'
| 'cast-spell'
| 'summon-creature'
| 'cancel-summon-creature'
| 'select-card-to-discard' 
| 'burn-mana';

export type TGameOption = { 
  player: '1' | '2';
  action: TAction;
  gId?: string;
};