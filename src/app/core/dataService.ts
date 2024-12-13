import { Injectable } from "@angular/core";
import { AuthService } from "./common/auth.service";
import { addDoc, collection, deleteField, doc, DocumentData, Firestore, getDoc, getDocs, onSnapshot, QueryDocumentSnapshot, QuerySnapshot, setDoc, updateDoc } from "@angular/fire/firestore";
import { EPhase, TCard, TCardLocation, TCast, TDBGameCard, TDeckRef, TGameCard, TGameDBState, TPlayer, TUser } from "./types";
import { BehaviorSubject, filter, map, Subject } from "rxjs";
import { Unsubscribe } from "firebase/auth";
import { BfDefer } from "bf-ui-lib";

export type TDBUnit = { ref: string, ownerId: string, sellPrice?: number };
export type TFullUnit = TDBUnit & { owner: TUser, isYours: boolean; cardId: string, shortRef: string, card: TFullCard };
export type TFullCard = TCard & { units: Array<TFullUnit>; }
export type TFullDeck = { id: string; deckName: string; units: Array<TFullUnit>; }

@Injectable({ providedIn: 'root' })
export class DataService {

  dbCards: Array<TCard> = [];
  cards: Array<TFullCard> = [];
  users: Array<TUser> = [];
  units: Array<TDBUnit> = [];
  yourDecks: Array<TFullDeck> = [];

  cards$: BehaviorSubject<Array<TFullCard>> = new BehaviorSubject([] as Array<TFullCard>);
  users$: BehaviorSubject<Array<TUser>> = new BehaviorSubject([] as Array<TUser>);
  units$: BehaviorSubject<Array<TDBUnit>> = new BehaviorSubject([] as Array<TDBUnit>);
  yourDecks$: BehaviorSubject<Array<TFullDeck>> = new BehaviorSubject([] as Array<TFullDeck>);

  yourCredit$ = this.users$.pipe(map(users => users.find(u => u.uid === this.auth.profileUserId)?.sats || 0));

  defaultUser: TUser = {
    uid       : '4cix25Z3DPNgcTFy4FcsYmXjdSi1',
    name      : 'Joel',
    email     : 'joel.barba.vidal@gmail.com',
    isAdmin   : true,
    isEnabled : true,
    sats      : 5000000,
  };


  private subs: Array<Unsubscribe> = [];
  private isUsersLoaded = false;
  private isUnitsLoaded = false;
  private loadDefer = new BfDefer();
  loadPromise = this.loadDefer.promise;
  
  private deferYourDecks = new BfDefer();
  yourDecksPromise = this.deferYourDecks.promise;

  constructor(
    private auth: AuthService,
    private firestore: Firestore,

  ) {
    // this.auth.profile$.pipe(filter(p => !!p)).subscribe(profile => {      
    //   this.loadCards();
    // });
    this.loadCards();
  }

  private async loadCards() {
    this.subs.forEach(unsubscribe => unsubscribe());
    this.isUsersLoaded = false;
    this.isUnitsLoaded = false;
    await this.auth.profilePromise;

    // When /cards collection changes
    this.subs.push(onSnapshot(collection(this.firestore, 'cards'), (snapshot: QuerySnapshot) => {
      this.dbCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TCard));
      this.cards = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() } as TFullCard;
        return { ...data, units: [] } as TFullCard;
      });      
      this.mergeData();
      // console.log('/cards collection changes', this.cards);
    }));

    // When /users collection changes
    this.subs.push(onSnapshot(collection(this.firestore, 'users'), (snapshot: QuerySnapshot) => {
      this.users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as TUser));
      this.users$.next(this.users);
      this.defaultUser = this.users.find(u => u.uid === this.defaultUser.uid) || this.defaultUser;
      this.isUsersLoaded = true;
      this.mergeData();
      // console.log('/users collection changes', this.users);
    }));

    // When /units collection changes
    this.subs.push(onSnapshot(collection(this.firestore, 'units'), (snapshot: QuerySnapshot) => {
      this.units = snapshot.docs.map(doc => ({ ref: doc.id, ...doc.data() } as TDBUnit));
      this.units$.next(this.units);
      this.isUnitsLoaded = true;
      this.mergeData();
      // console.log('/units collection changes', this.units);
    }));

    // When your decks change
    if (this.auth.profileUserId) {
      await this.loadPromise;
      this.subs.push(onSnapshot(collection(this.firestore, 'users', this.auth.profileUserId, 'decks'), (snapshot: QuerySnapshot) => {
        this.yourDecks = snapshot.docs.map(doc => {
          const deck = { id: doc.id, ...doc.data() } as TDeckRef; // Here we only have the units ref
          const units = deck.units.map(ref => {
            const card = this.cards.find(c => c.id === ref.split('.')[0]);
            const unit = card?.units.find(u => u.ref === ref);
            if (!unit) { console.log(`Error on Deck ${deck.deckName}. No reference ${ref} for ${card?.name}/${card?.id}`); }
            return unit;
          }) as Array<TFullUnit>;

          return { id: deck.id, deckName: deck.deckName, units: units.filter(u => !!u) } as TFullDeck;
        });
        this.yourDecks$.next(this.yourDecks);
        this.deferYourDecks.resolve(this.yourDecks);
        // console.log('your deck changes', this.yourDecks);
      }));
    }
  }

  private mergeData() { // Merging cards + users + units
    this.cards.forEach(card => {
      card.units = this.units.filter(u => u.ref.split('.')[0] === card.id).map(unit => {
        const owner = this.users.find(u => u.uid === unit.ownerId) || this.defaultUser;
        const isYours = this.auth.profileUserId === unit.ownerId;
        const cardId = unit.ref.split('.')[0] || '';
        const shortRef = unit.ref.split('.')[1] || '';
        const card = this.cards.find(c => c.id === cardId);
        if (!card) { console.error(`CARD ID NOT FOUND:`, cardId); }
        return { ...unit, owner, isYours, cardId, shortRef, card: card || this.cards[0] };
      });
    });
    if (this.isUsersLoaded && this.isUnitsLoaded) {
      this.cards$.next(this.cards);
      this.loadDefer.resolve(this.cards);
    }
  }


  async buyUnit(unit: TFullUnit): Promise<string | void> {  // TODO: All this logic should go to a cloud function to be called through a webAPI
    console.log('Buying unit', unit);

    const price = (typeof unit.sellPrice === 'string' ? Number.parseInt(unit.sellPrice, 10) : unit.sellPrice) || 0;

    if ((this.auth.profile?.sats || 0) < price) { return `You don't have enough sats to buy it`; }

    this.auth.spendSats(price); // Take buyer money (your money)
    
    // Add money to the seller
    let docSnap = await getDoc(doc(this.firestore, 'users', unit.ownerId));
    const owner = docSnap.data() as TUser;
    owner.sats += price;
    await updateDoc(doc(this.firestore, 'users', unit.ownerId), { sats: owner.sats });
    
    // Change unit owner + Delete Offer
    await setDoc(doc(this.firestore, 'units', unit.ref), { ownerId: this.auth.profileUserId });
  }

  async sellUnit(unit: TFullUnit, sellPrice: number) {
    console.log('Selling Card', unit);
    await updateDoc(doc(this.firestore, 'units', unit.ref), { sellPrice });
  }

  async removeSellOffer(unit: TFullUnit) {
    await updateDoc(doc(this.firestore, 'units', unit.ref), { sellPrice: deleteField() });
  }


  async requestNewGame(player1: { id: string, name: string, deckId: string }, player2Id: string, gameId?: string): Promise<string | void> {
    const player2 = this.users.find(u => u.uid === player2Id);
    if (!player2) { return 'User Id not found ' + player2Id; }

    const defaultPlayerValues = {
      help: '',
      life: 20,
      manaPool: [0,0,0,0,0,0] as TCast,
      drawnCards: 0,
      summonedLands: 0,
      stackCall: false,      
    };   
    const playerYou   = { userId: player1.id, name: player1.name, ...defaultPlayerValues };
    const playerOther = { userId: player2Id,  name: player2.name, ...defaultPlayerValues };

    const newGame: TGameDBState = {
      created: new Date() + '',
      status: 'created',
      turn: '1',
      phase: EPhase.untap,
      subPhase: null,
      player1: { ...playerYou,   num: '1' } as TPlayer,
      player2: { ...playerOther, num: '2' } as TPlayer,
      cards: [],
      effects: [],
      control: '1', // Player1 starts (will shuffle later)
      id: 0,
      deckId1: player1.deckId,
      deckId2: '', // Waiting for player 2 to accept the request and add a deck
    };

    console.log('New Game', newGame);

    if (gameId) {
      await setDoc(doc(this.firestore, 'games', gameId), newGame); // this is for testing
    } else {
      const docRef = await addDoc(collection(this.firestore, 'games'), newGame);
      gameId = docRef.id;
    }
    await setDoc(doc(this.firestore, 'gamesChat',    gameId), newGame);
    await setDoc(doc(this.firestore, 'gamesHistory', gameId), newGame);
  }



  async createNewGame(gameId: string, player2DeckId: string, shuffle = false): Promise<string | void> {
    let docSnap = await getDoc(doc(this.firestore, 'games', gameId));
    if (!docSnap.exists()) { return 'Game Id not found: ' + gameId;  }
    const newGame = docSnap.data() as TGameDBState;

    // Player 1's deck
    docSnap = await getDoc(doc(this.firestore, 'users', newGame.player1.userId, 'decks', newGame.deckId1));
    if (!docSnap.exists()) { return 'Deck Id not found: ' + newGame.deckId1;  }
    const dbDeck1 = docSnap.data() as TDeckRef;
    let cardsDeck1 = dbDeck1.units.map(u => u.split('.')[0]);


    // Player 2's deck
    const fullDeck2 = this.yourDecks.find(d => d.id = player2DeckId);
    if (!fullDeck2) { return 'Deck Id not found ' + player2DeckId; }
    let cardsDeck2 = fullDeck2.units.map(u => u.cardId);
    newGame.deckId2 = player2DeckId;

    if (cardsDeck1.length <= 8) { return `Deck ${dbDeck1.deckName} has only ${cardsDeck1.length} cards. You need at least 8 cards to play`; }
    if (cardsDeck2.length <= 8) { return `Deck ${fullDeck2.deckName} has only ${cardsDeck2.length} cards. You need at least 8 cards to play`; }

    // Randomly set who starts the game
    if (shuffle && Math.random() * 2 >= 0.5) {
      newGame.turn = '2';
      newGame.control = '2';
    }

    // Generate the list of cards
    const generateId = (ind: number) => 'g' + (ind + '').padStart(3, '000');
    const gameCard = (cardId: string, playerNum: '1' | '2', order: number): TDBGameCard | null => {
      const card = this.dbCards.find(c => c.id === cardId);
      if (!card) { return null; }
      if (shuffle) { order = Math.round(Math.random() * 9999); }
      // if (card['units']) { delete card.units };
      return {
        ...card,
        gId: '',
        order,
        location: 'deck' + playerNum as TCardLocation, 
        owner: playerNum, 
        controller: playerNum, 
        isTapped: false,
        status: null,
        combatStatus: null,
        targets: [],
        blockingTarget: null,
        turnDamage: 0,
        turnAttack: 0,
        turnDefense: 0,
      } as TDBGameCard;
    }

    [cardsDeck1, cardsDeck2] = this.testDecks();

    const deck1 = cardsDeck1.map((cardId, ind) => gameCard(cardId, '1', ind)).filter(c => !!c) as Array<TDBGameCard>;
    const deck2 = cardsDeck2.map((cardId, ind) => gameCard(cardId, '2', ind)).filter(c => !!c) as Array<TDBGameCard>;

    deck1.sort((a, b) => a.order > b.order ? 1 : -1).forEach((c, ind) => c.order = ind);
    deck2.sort((a, b) => a.order > b.order ? 1 : -1).forEach((c, ind) => c.order = ind);

    newGame.cards = deck1.concat(deck2) as Array<TGameCard>;
    newGame.cards.forEach((c, ind) => c.gId = generateId(ind)); // Generate unique identifiers on the game

    // Move the first 7 cards to each player's hand
    newGame.cards.filter(c => c.owner === '1' && c.order < 7).forEach(c => c.location = 'hand1');
    newGame.cards.filter(c => c.owner === '2' && c.order < 7).forEach(c => c.location = 'hand2');

    // Save newGame changes to DB
    console.log('New Game', newGame);
    await setDoc(doc(this.firestore, 'games', gameId), newGame);
  }


  private testDecks() {
    const cardsDeck1 = [
      'c000001',  // Island
      'c000003',  // Swamp
      'c000010',  // Mox Sapphire
      'c000010',  // Mox Sapphire
      'c000007',  // Mox Jet
      'c000023',  // Ancestral Recall
      'c000023',  // Ancestral Recall
      'c000011',  // Sol Ring
      'c000026',  // Black Knight
      'c000025',  // Bad Moon
      'c000026',  // Black Knight
      'c000055',  // Unholy Strength
      'c000026',  // Black Knight
      'c000053',  // Ornithopter
      'c000055',  // Unholy Strength
      'c000026',  // Black Knight
      'c000055',  // Unholy Strength
      'c000055',  // Unholy Strength
      'c000053',  // Ornithopter
      'c000027',  // Dark Ritual
      // 'c000000',  // 
    ];
    const cardsDeck2 = [
      'c000005',  // Forest
      'c000004',  // Mountain
      'c000006',  // Mox Emerald
      'c000006',  // Mox Emerald
      'c000009',  // Mox Ruby
      'c000009',  // Mox Ruby
      'c000011',  // Sol Ring
      'c000033',  // Shivan Dragon
      'c000046',  // Granite Gargoley
      'c000053',  // Ornithopter
      'c000052',  // Mons's Goblin Raiders
      'c000044',  // Giant Spider
      'c000041',  // Elvis Archers
      'c000041',  // Elvis Archers
      'c000043',  // Giant Growth
      'c000032',  // Ligthning Bolt
      'c000032',  // Ligthning Bolt
      'c000032',  // Ligthning Bolt
      'c000032',  // Ligthning Bolt
      // 'c000000',  // 
    ];
    return [cardsDeck1, cardsDeck2];
  }

}