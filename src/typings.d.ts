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
  id         ?: string
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
  userNum: 1 | 2;
  action: string;
  params: any;
}

export interface IGameCard {
  $card  ?: Card;
  ref     : string;
  deckOrder : number;
  playOrder : number;
  loc     : 'deck' | 'hand' | 'play' | 'grav' | 'disc';
  isTap   : boolean;
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
}

export interface IGame {
  created: string;
  status : 0 | 1 | 2;   // 0=running, 1=paused on userA, 2=paused on user B
  // 10=untap, 20=maintenance, 30=draw, 40=pre-combat, 50=combat, 60=post-combat, 70=discard, 80=end
  phase  : 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 110 | 120 | 130 | 140 | 150 | 160 | 170 | 180;

  log: Array<IGameLog>;

  user1  : IGameUser;
  user2  : IGameUser;

  $userA ?: IGameUser;
  $userB ?: IGameUser;
}
