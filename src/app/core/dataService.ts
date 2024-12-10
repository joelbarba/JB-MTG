import { Injectable } from "@angular/core";
import { AuthService } from "./common/auth.service";
import { collection, deleteField, doc, DocumentData, Firestore, getDoc, getDocs, onSnapshot, QueryDocumentSnapshot, QuerySnapshot, setDoc, updateDoc } from "@angular/fire/firestore";
import { TCard, TDeckRef, TUser } from "./types";
import { BehaviorSubject, map, Subject } from "rxjs";
import { Unsubscribe } from "firebase/auth";
import { BfDefer } from "@blueface_npm/bf-ui-lib";

export type TDBUnit = { ref: string, ownerId: string, sellPrice?: number };
export type TFullUnit = TDBUnit & { owner: TUser, isYours: boolean; cardId: string, shortRef: string, card: TFullCard };
export type TFullCard = TCard & { units: Array<TFullUnit>; }
export type TFullDeck = { id: string; deckName: string; units: Array<TFullUnit>; }

@Injectable({ providedIn: 'root' })
export class DataService {

  cards!: Array<TFullCard>;
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

  constructor(
    public auth: AuthService,
    public firestore: Firestore,
  ) {
    this.loadCards();
  }

  private async loadCards() {
    await this.auth.profilePromise;

    // When /cards collection changes
    this.subs.push(onSnapshot(collection(this.firestore, 'cards'), (snapshot: QuerySnapshot) => {
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
      this.loadDefer.resolve(this.cards);
      this.cards$.next(this.cards);
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

}