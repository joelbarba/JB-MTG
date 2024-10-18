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
  id    : string; // C000000
  cast  : TCast;
  color : TColor;
  name  : string;
  image : string;
  text  : string;
  type  : TCardType;
};

export type TCardLocation = 'off'
  | 'deck1' | 'hand1' | 'tble1' | 'grav1'
  | 'deck2' | 'hand2' | 'tble2' | 'grav2';

export type TGameCard = TCard & {
  gId: string;
  owner: '1' | '2';       // player 1 | player 2
  controller: '1' | '2';  // player 1 | player 2
  order: number;
  location: TCardLocation;
  isTapped: boolean;
  selectableAction: null | { text: string; action: TAction };
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
  life: number;
  manaPool: TCast;
  drawnCards: number;  // Only 1 per turn
  summonedLands: number;  // Only 1 per turn
}

export type TGameState = {
  created: string;
  status: 'created' | 'playing' | 'player1win' | 'player2win' | 'error';
  currentPlayerNum: '1' | '2';
  phase: EPhase;
  player1: TPlayer;
  player2: TPlayer;
  cards: Array<TGameCard>;
  options: Array<TGameOption>;
}

export type TAction = 
'start-game' |
'draw' |
'summon-land' |
'select-card-to-discard' |
'tap-land' |
'skip-phase';

export type TGameOption = { 
  player: '1' | '2';
  action: TAction;
  gId?: string;
};