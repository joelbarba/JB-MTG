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
  untap   = 'untap',
  upkeep  = 'upkeep',
  draw    = 'draw',
  pre     = 'pre',
  combat  = 'combat',
  post    = 'post',
  discard = 'discard',
  end     = 'end'
}
export enum ESubPhase {
  selectAttack   = 'selectAttack', 
  attacking      = 'attacking',
  selectDefense  = 'selectDefense', 
  beforeDamage   = 'beforeDamage',
  afterDamage    = 'afterDamage',
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
  isWall           : boolean;  // They cannot attack, only defend
  isFlying         : boolean;  // Cannot be blocked by a non flying creatures
  isTrample        : boolean;  // Deals the excess damage (over defenders toughness) to the player
  isFirstStrike    : boolean;  // When dealing combat damage, if that kills the other attacking/defender, they don't receive any damage
  isHaste          : boolean;  // No summoning sickness
  canRegenerate    : null | boolean; // Whether it has the regenerate ability (false = it has the ability but not at the moment)
  notBlockByWalls  : boolean;  // true=It cannot be blocked by walls
  noTargetSpells   : boolean;  // true=It cannot be target of spells or effects
  canPreventDamage : boolean;  // true=A spell that can be triggered when damage is received
  colorProtection  : TColor | null; // Cannot be blocked, targeted, enchanted or damage by sources of this color
  upkeepPlayer: 'A' | 'B' | 'AB' | null;  // Whether the upkeep applies to the card's controller (A), opponent's (B)
  landWalk: 'island' | 'plains' | 'swamp' | 'mountain' | 'forest' | null; // Islandwalk, Plainswalk, Swampwalk, Mountainwalk, Forestwalk
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
  scope: 'permanent' | 'turn'; // The lifespan of the effect
  trigger: 'constantly' | 'onDraw' | 'onTapLand' | // When is the onEffect() called
           'onEndTurn'  | 'duringSelAttack' |
           'onEndUntap' | 'onEndUpkeep' | 'onEndDraw' | 'onEndPre' | 'onEndCombat' | 'onEndPost' | 'onEndDiscard' | // when phases end
           'onEndSelectAttack' | 'onEndAttacking' | 'onEndSelectDefense' | 'onEndBeforeDamage' | 'onEndAfterDamage' // when subphases end
  targets: Array<string>; // Array of gIds or player1 or player2
  xValue?: number;        // In case of effects that add X attack/defense
  playerNum?: '1' | '2';  // In case it applies only to 1 player (turn player 1/2, onDraw player 1/2)
}



export type TPlayer = {
  userId: string;
  name: string;
  num: '1' | '2';
  life: number;
  manaPool: TCast;
  extraTurns: number;     // If > 0, the player plays again
  turnDrawnCards: number; // Only 1 per turn
  summonedLands: number;  // Only 1 per turn
  stackCall: boolean;  // true if the spell-stack needs to stop on the player
  selectableAction?: null | TGameOption;
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
  lifeChanges: Array<TLifeChange>;    // Popup to show when a player loses/gains life
  lifeChangesInitiator: null | '1' | '2'; // Remember the player num that initiated the lifChange (so control is returned after acknowledgment)
  spellStackInitiator: null | '1' | '2';  // Remember the player num that initiated the spell stack (so control is returned after release)
  lastAction?: TGameOption & { time: string, player: '1' | '2' };
  seq: number; // sequential order
  deckId1: string;
  deckId2: string; // If empty = waiting for player2 to accept request
}
export type TGameState = TGameDBState & { options: Array<TGameOption> };
export type TGameHistory = TGameState & { history: Array<TGameOption & { time: string, player: '1' | '2' }>; }
export type TLifeChange = {
  player : '1' | '2',
  damage : number;  // Damage (X = damage / -X = life)
  originalDamage : number; // If reverted (reverse damage), this stays always as the original
  timer  : number;  // Number of milliseconds the panel is shown (0=no timer)
  gId   ?: string;  // Card (gId) that caused the damage
  title ?: string;
  icon  ?: string;
  text  ?: string;  // Text to display when it's your damage/life
  opText?: string;  // Text to display when it's the opponent's damage/life
}



export type TDBGameCard = {
  name        : string;
  id          : string; // c000000
  gId         : string; // g000
  owner       : '1' | '2';  // player 1 | player 2
  controller  : '1' | '2';  // player 1 | player 2
  order       : number;
  location    : TCardLocation;
  isTapped    : boolean;
  status: null | 'sickness',
  combatStatus: null | 'combat:attacking' | 'combat:defending' | 'combat:selectingTarget';
  isDying: boolean,  // If card.canRegenerate, you get a special step to trigger the regeneration ability

  targets: Array<string>;         // Aarray of gIds, playerA, playerB
  blockingTarget: string | null;  // For combat: When defending, the gId of the attacking creature this one is blocking

  xValue: number; // Value of the manaExtra used when actioning the card
  waitingUpkeep: boolean;  // Whether the upkeep of the card it's still not processed this turn
  tokens: Array<string>;

  turnDamage: number;  // Amount of damaged received during the current turn (if >= defense it dies)
  turnAttack: number;  // <-- attack + effects
  turnDefense: number; // <-- defense + effects
  turnLandWalk: 'island' | 'plains' | 'swamp' | 'mountain' | 'forest' | null; // Copied from card.landWalk every turn ini
  turnCanRegenerate: null | boolean; // Copied from card.canRegenerate every turn ini
}
// export type TCardToken = { id: string; text?: string; };

export type TGameCard = TDBGameCard & TCard & { // Not in DB (fixed properties from TCard + extended props & functions)
  selectableAction?: null | TGameOption;
  // selectableTarget?: null | { text: string, value: string };
  effectsFrom?: Array<TEffect>;
  targetOf?: Array<TGameCard>;
  uniqueTargetOf?: Array<TGameCard>;
  hideOnStack?: boolean; // To not reveal the card when dislpayed on the stack
  hideTargetsOnStack?: boolean; // To not reveal the targets of the card when dislpayed on the stack

  onStack:   (state: TGameState) => void;   // What the card does when it's added to the stack
  onSummon:  (state: TGameState) => void;   // What the card does when it's summoned
  onAbility: (state: TGameState) => void;   // What the card does when it's used for its ability (tap...)
  onDestroy: (state: TGameState) => void;   // What the card does when it's destroyed
  onDiscard: (state: TGameState) => void;   // What the card does when it's discarded
  onUpkeep:  (state: TGameState, skip: boolean, targets?: string[]) => void;   // What the card does during the upkeep phase
  onEffect:  (state: TGameState, effectId: string, gId?: string, params?: TActionParams) => void; // What the effect of the card does when it's applied
  onPlayerDamage: (state: TGameState, damage: number) => void; // when the card damages a player in combat
  onCreatureDamage: (state: TGameState, gId: string, damage: number) => void; // when the card damages a creature in combat
  afterCombat: (state: TGameState) => void;  // What the card does after combat
  isType:  (...type: TCardExtraType[]) => boolean; // Checks if the card is of a certain type
  isColor: (color: TColor) => boolean; // Checks if the card is of a certain color
  canUntap: (state: TGameState) => boolean;  // Whether the card can be normally untapped
  canAttack: (state: TGameState) => boolean;  // Whether the creature can be selected to attack
  canDefend: (state: TGameState) => boolean;  // Whether the creature can be selected to defend
  targetBlockers: (state: TGameState) => Array<string>; // List of attackers the creature can block
  getSummonCost:  (state: TGameState) => TActionCost | null; // Cost to summon the card
  getAbilityCost: (state: TGameState) => TActionCost | null; // Cost to trigger a card ability
  getUpkeepCost:  (state: TGameState) => TActionCost | null; // Cost play the onUpkeep() action
  getCost: (state: TGameState, action: 'summon-spell' | 'trigger-ability' |'pay-upkeep') => TActionCost | null; // Generic cost getter
}
export type TGameOption = { action: TAction, params: TActionParams, text?: string };
export type TActionCost = { 
  mana            : TCast,      // The fixed mana needed
  xMana           ?: TCast,     // If extra mana, what colors are allowed (0=not allowed, >0 allowed)
  neededTargets   ?: number,    // Number of targets needed
  possibleTargets ?: string[],  // Possible ids of the targets (gId / playerNum / custom /...)
  customDialog    ?: boolean,   // If a custom dialog is needed (dialog code = card name)
  tap             ?: boolean,   // If the cost requires the card to tap
  canSkip         ?: boolean,   // (only for upkeep) If true, the cost is optional and can be skipped
  skipText        ?: string,    // If it can be skipped, the text on the "Cancel" button
  text            ?: string,    // Description of the cost and action that triggers
  opText          ?: string,    // Text to show to the opponent while player is performing the cost
  effect          ?: 'onTapLand'; // Effects to trigger when the ability is used
};
export type TGameCards = Array<TGameCard>;
export type TExtGameCard = TGameCard & {
  posX: number;
  posY: number;
  zInd: number;
  grid: 'A' | 'B';
}







export type TAction = 'start-game' 
| 'refresh'
| 'debug-card-to-hand'
| 'skip-phase'
| 'untap-card'
| 'untap-all'
| 'draw' 
| 'summon-land' 
| 'summon-spell'
| 'trigger-ability'
| 'select-card-to-discard'
| 'select-attacking-creature'
| 'cancel-attack'
| 'submit-attack'
| 'select-defending-creature'
| 'cancel-defense'
| 'submit-defense'
| 'continue-combat'
| 'release-stack'
| 'regenerate-creature'
| 'cancel-regenerate'
| 'pay-upkeep'
| 'skip-upkeep'
| 'acknowledge-life-change'
;

export type TActionParams = { 
  gId               ?: string;
  manaToUse         ?: TCast,
  manaForUncolor    ?: TCast,
  manaExtra         ?: TCast,
  isExtraManaReady  ?: boolean,
  targets           ?: Array<string> 
}

export type TCardOpStatus = 'waitingMana' | 'selectingMana' | 'waitingExtraMana' | 'selectingTargets';