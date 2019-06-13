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
