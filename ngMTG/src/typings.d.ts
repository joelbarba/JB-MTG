export interface Card {
  id?: string;
  name: string;
  type: string;
  color: string;
  text: string;
  image: string;
  cast: Array<number>;
  power: number;
  defence: number;

  orderId ?: string;
  units   ?: Array<{ ref: string; owner?: string }>;
}
export interface User {
  username  : string;
  email     : string;
  name      : string;
  cards     : Array<string>;  // refs
  decks    ?: Array<UserDeck>;
  $cards   ?: Array<UserCard>;  // Extended cards (card obj inc)
}

// Extended object form user.cards[]
export interface UserCard {
  ref: string;
  card: Card;
}
export interface UserDeck {
  id         ?: string;
  name        : string;
  description : string;
  cards       : Array<string>; // refs
  $cards     ?: Array<UserCard>; // Extended cards (card obj inc)
}

export interface DeckCard {
  id : string;  // Pointer to /cards/<id> (c1)
  ref: string;  // Pointer to card.units[ref]
  card ?: Card; // Copy of the card object (from /cards)
}


export interface IGameLog {
  executed ?: string;
  player: 1 | 2;
  action: string;
  params: any;
}

export interface IGameTarget {
  type  : 'card' | 'player';
  card  ?: IGameCard;
  player?: IGameUser;
}

export interface IGameCard {
  $card  ?: Partial<Card>;
  id     ?: string;
  ref     : string;
  deckOrder : number;
  playOrder : number;
  loc     : 'deck' | 'hand' | 'play' | 'grav' | 'disc';
  isTap   : boolean;
  damage  : number; // For creatures: Temp damage during the current turn
  $owner  : 'me' | 'op';
  $player : 1 | 2;
}

export interface IGameUser {
  userId   : string;
  deckId   : string;
  userName : string;
  deckName : string;
  life     : number;
  ready    : boolean;
  manaPool : [number, number, number, number, number, number];
  deck     : Array<IGameCard>;
  summonedLands : 0;  // Lands summoned during the current turn
  $numPlayer ?: 1 | 2; // For references, to know whether is pointing to player1 / 2
}

export interface IGame {
  created: string;
  status : number;   // 0=Init, 1=Running, 100=Paused on player1, 200=Paused on player2
  phase: number; // 10=untap, 20=maintenance, 30=draw, 40=pre-combat, 50=combat, 60=post-combat, 70=discard, 80=end
  lastPlayer: null | 1 | 2; // Last player to update the game
  lastToken: string; // Reference to the client that sent the last update

  log: Array<IGameLog>;

  player1: IGameUser;
  player2: IGameUser;

}
