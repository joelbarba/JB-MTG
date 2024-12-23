export type TColor = 'uncolored' | 'blue' | 'white' | 'black' | 'red' | 'green' | 'special';
export type TCast = [number, number, number, number, number, number];
export type TCardType = 'land' | 'creature' | 'instant' | 'interruption' | 'artifact' | 'sorcery' | 'enchantment';
export type TCardExtraType = TCardType | 'island' | 'plains' | 'swamp' | 'mountain' | 'forest';

export type TUser = {
  name: string;
  email: string;
  uid: string;
  isAdmin: boolean;
  isEnabled: boolean;
  sats: number;
  // decks: Array<TDeckRef>;
}
export type TDeckRef = {
  id: string;
  deckName: string;
  units: Array<string>;  // unit ref
}

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
  regenerate     = 'regenerate',
}

export type TCard = {
  id      : string; // C000000
  cast    : TCast;
  color   : TColor;
  name    : string;
  image   : string;
  text    : string;
  type    : TCardType;
  price   : number;
  attack  : number;
  defense : number;
  border? : 'white' | 'black';  // The color of the border (undefined = white)
  isWall        : boolean;  // They cannot attack, only defend
  isFlying      : boolean;  // Cannot be blocked by a non flying creatures
  isTrample     : boolean;  // Deals the excess damage (over defenders toughness) to the player
  isFirstStrike : boolean;  // When dealing combat damage, if that kills the other attacking/defender, they don't receive any damage
  isHaste       : boolean;  // No summoning sickness
  canRegenerate : boolean;  // Whether it has the regenerate ability
  colorProtection: TColor | null; // Cannot be blocked, targeted, enchanted or damage by sources of this color
  maxInDeck?: number;    // Max number of the same card you can have in a deck (1, 4, undefined=as many as you want)
  readyToPlay: boolean;
  // units: Array<{ ref: string, owner: string }>;
};

export type TCardLocation = 'discarded' | 'stack'
  | 'deck1' | 'hand1' | 'tble1' | 'grav1'
  | 'deck2' | 'hand2' | 'tble2' | 'grav2';
export type TCardSemiLocation = 'discarded' | 'deck' | 'hand' | 'tble' | 'grav';
export type TCardAnyLocation = TCardLocation | TCardSemiLocation;

export type TTargetType = {
  player?: 'A' | 'B';       // If provided, the selected target must be player A or B
  cardType?: TCardType;     // If provided, the selected target must be of this type
  location?: TCardAnyLocation; // If provided, the selected target must be of this location
}

export type TEffect = {
  id: string; // Id of the effect
  gId: string; // gId of the card that generated the effect
  scope: 'permanent' | 'turn' | 'endTurn';
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
  deckId1: string;
  deckId2: string; // If empty = waiting for player2 to accept request
}
export type TGameState = TGameDBState & { options: Array<TGameOption> };
export type TGameHistory = TGameState & { history: Array<TGameOption & { time: string, player: '1' | '2' }>; }

export type TDBGameCard = {
  name        : string;
  id          : string; // C000000
  gId         : string;
  owner       : '1' | '2';       // player 1 | player 2
  controller  : '1' | '2';  // player 1 | player 2
  order       : number;
  location    : TCardLocation;
  isTapped    : boolean;
  status: null | 'summoning' | 'sickness'
               | 'summon:waitingMana'  | 'summon:selectingMana'  | 'summon:selectingTargets' 
               | 'ability:waitingMana' | 'ability:selectingMana' | 'ability:selectingTargets';
  combatStatus: null | 'combat:attacking' | 'combat:defending' | 'combat:selectingTarget';
  isDying: boolean,     // If card.canRegenerate, you get a special step to trigger the regeneration ability

  customDialog: null | string;  // If the card requires a custom dialog to open when it's :selectingTargets

  targets: Array<string>;         // Aarray of gIds, playerA, playerB
  blockingTarget: string | null;  // For combat: When defending, the gId of the attacking creature this one is blocking

  turnDamage: number;
  turnAttack: number;  // <-- attack + effects
  turnDefense: number; // <-- defense + effects
}

export type TGameCard = TDBGameCard & TCard & { // Not in DB (fixed properties from TCard + extended props & functions)
  selectableAction?: null | TGameOption;
  selectableTarget?: null | { text: string, value: string };
  effectsFrom?: Array<TEffect>;
  targetOf?: Array<TGameCard>;
  uniqueTargetOf?: Array<TGameCard>;

  onSummon:  (state: TGameState) => void;   // What the card does when it's summoned
  onAbility: (state: TGameState) => void;   // What the card does when it's used for its ability (tap...)
  onDestroy: (state: TGameState) => void;   // What the card does when it's destroyed
  onDiscard: (state: TGameState) => void;   // What the card does when it's discarded
  onEffect:  (state: TGameState, effectId: string) => void;  // What the effect of the card does when it's applied
  afterCombat: (state: TGameState) => void;  // What the card does after combat
  isType:  (type: TCardExtraType) => boolean; // Checks if the card is of a certain type
  isColor: (color: TColor) => boolean; // Checks if the card is of a certain color
  canAttack: (state: TGameState) => boolean;  // Whether the creature can be selected to attack
  canDefend: (state: TGameState) => boolean;  // Whether the creature can be selected to defend
  targetBlockers: (state: TGameState) => Array<string>; // List of attackers the creature can block
  getSummonCost:  (state: TGameState) => { mana: TCast, neededTargets?: number, possibleTargets?: string[], customDialog?: string } | null; // Cost to summon the card
  getAbilityCost: (state: TGameState) => { mana: TCast, neededTargets?: number, possibleTargets?: string[], customDialog?: string, tap: boolean, text: string } | null; // Cost to trigger a card ability
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
| 'cancel-ability'
| 'select-card-to-discard'
| 'trigger-ability'
| 'burn-mana'
| 'select-attacking-creature'
| 'cancel-attack'
| 'submit-attack'
| 'select-defending-creature'
| 'cancel-defense'
| 'submit-defense'
| 'release-stack'
| 'regenerate-creature'
| 'cancel-regenerate'
;

export type TActionParams = { 
  gId?: string;
  manaForUncolor?: TCast,
  targets?: Array<string> 
}


