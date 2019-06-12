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
  username: string;
  email: string;
  name: string;
  cards: Array<UserCard>;
}
export interface UserCard {
  card: string;
  ref: string;
  cardObj ?: Card;
}

export interface UserDeck {
  name: string;
  description: string;
  cards: Array<UserCard>;
}
