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
  cards     : Array<UserCard>;
  decks    ?: Array<UserDeck>; 
}
export interface UserCard {
  id : string;  // Pointer to /cards/<id> (c1)
  ref: string;  // Pointer to card.units[ref]
  card ?: Card; // Copy of the card object (from /cards)
}

export interface UserDeck {
  id?: string
  name: string;
  description: string;
  cards: Array<UserCard>;
}



export interface IGameCard {
  id    : string,
  ref   : string,
  order : number,
  loc   : 'deck' | 'hand' | 'game' | 'graveyard';
  card  : Card,
}
export interface IUserGame {
  user_id : string;
  deck_id : string;
  life   : number,
  phase  : number,
  ready  : boolean,
  deck   : Array<IGameCard>
}
export interface IGame {
  created: string;
  status: number;
  user_a: IUserGame;
  user_b: IUserGame;
}

