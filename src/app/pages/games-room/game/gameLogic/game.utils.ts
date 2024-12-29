import { TCardAnyLocation, TCardLocation, TCast, TGameCard, TGameState, TPlayer } from "../../../../core/types";


// Shortcut for state objects (cards split on locations)
export const getCards = (state: TGameState, playerANum: '1' | '2'): { 
  deck:  Array<TGameCard>, hand:  Array<TGameCard>, table:  Array<TGameCard>, play:  Array<TGameCard>, graveyard:  Array<TGameCard>,
  deckA: Array<TGameCard>, handA: Array<TGameCard>, tableA: Array<TGameCard>, playA: Array<TGameCard>, graveyardA: Array<TGameCard>, 
  deckB: Array<TGameCard>, handB: Array<TGameCard>, tableB: Array<TGameCard>, playB: Array<TGameCard>, graveyardB: Array<TGameCard>,
  stack: Array<TGameCard>, tableStack: Array<TGameCard>, tableAStack: Array<TGameCard>
} => {
  const playerBNum = playerANum === '1' ? '2' : '1';
  const deck        = state.cards.filter(c => c.location.slice(0,4) === 'deck').sort((a, b) => a.order > b.order ? 1 : -1);
  const hand        = state.cards.filter(c => c.location.slice(0,4) === 'hand').sort((a, b) => a.order > b.order ? 1 : -1);
  const table       = state.cards.filter(c => c.location.slice(0,4) === 'tble').sort((a, b) => a.order > b.order ? 1 : -1);
  const play        = state.cards.filter(c => c.location.slice(0,4) === 'play').sort((a, b) => a.order > b.order ? 1 : -1);
  const graveyard   = state.cards.filter(c => c.location.slice(0,4) === 'grav').sort((a, b) => a.order > b.order ? 1 : -1);
  const deckA       = state.cards.filter(c => c.location === 'deck' + playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
  const deckB       = state.cards.filter(c => c.location === 'deck' + playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);
  const handA       = state.cards.filter(c => c.location === 'hand' + playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
  const handB       = state.cards.filter(c => c.location === 'hand' + playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);
  const tableA      = state.cards.filter(c => c.location === 'tble' + playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
  const tableB      = state.cards.filter(c => c.location === 'tble' + playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);
  const playA       = state.cards.filter(c => c.location === 'play' + playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
  const playB       = state.cards.filter(c => c.location === 'play' + playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);
  const graveyardA  = state.cards.filter(c => c.location === 'grav' + playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
  const graveyardB  = state.cards.filter(c => c.location === 'grav' + playerBNum).sort((a, b) => a.order > b.order ? 1 : -1);
  const stack       = state.cards.filter(c => c.location === 'stack').sort((a, b) => a.order > b.order ? 1 : -1);
  const tableStack  = state.cards.filter(c => c.location === 'stack' || c.location.slice(0,4) === 'tble').sort((a, b) => a.order > b.order ? 1 : -1);
  const tableAStack = state.cards.filter(c => c.location === 'stack' || c.location === 'tble' + playerANum).sort((a, b) => a.order > b.order ? 1 : -1);
  return { deck,  hand,  table,  play,  graveyard, stack, tableStack, tableAStack,
           deckA, handA, tableA, playA, graveyardA, 
           deckB, handB, tableB, playB, graveyardB };
}

// Shortcut for state objects (relative players)
export const getPlayers = (state: TGameState, playerANum: '1' | '2'): {
  player1: TPlayer, playerA: TPlayer, attackingPlayer: TPlayer,
  player2: TPlayer, playerB: TPlayer, defendingPlayer: TPlayer,
  turnPlayer: TPlayer, controlPlayer: TPlayer
} => {
  const playerBNum = playerANum === '1' ? '2' : '1';
  const player1    = state.player1;
  const player2    = state.player2;
  const playerA    = playerANum === '1' ? state.player1 : state.player2;
  const playerB    = playerBNum === '1' ? state.player1 : state.player2;
  const turnPlayer       = state.turn    === '1' ? state.player1 : state.player2;
  const controlPlayer    = state.control === '1' ? state.player1 : state.player2;
  const attackingPlayer  = state.turn    === '1' ? state.player1 : state.player2;
  const defendingPlayer  = state.turn    === '1' ? state.player2 : state.player1;
  return { player1, player2, playerA, playerB, turnPlayer, controlPlayer, attackingPlayer, defendingPlayer };
}



// Moves a card from its current location to another.
// If toLocation is deck, hand, tble or grav, the player number is added from the current location
// Ex:  moveCard(state, 'tble'):   'hand1' ---> 'tble1'   or   'hand2' ---> 'tble2'
export const moveCard = (state: TGameState, gId: string, toLocation: string) => {
  const card = state.cards.find(c => c.gId === gId);
  if (card) {
    const fromLocation = card.location;
    let playerNum = fromLocation.at(-1);
    if (playerNum !== '1' && playerNum !== '2') { playerNum = card.controller; }
    if (['deck', 'hand', 'tble', 'grav'].includes(toLocation)) { toLocation += playerNum; }

    // Move the card to the last position in the destination
    const lastCard = state.cards.filter(c => c.location === toLocation).sort((a,b) => a.order > b.order ? 1 : -1).at(-1);
    if (lastCard) { card.order = lastCard.order + 1; } else { card.order = 0; }

    card.location = toLocation as TCardLocation;

    // Recalculate orders to make them sequential
    state.cards.filter(c => c.location === fromLocation).sort((a,b) => a.order > b.order ? 1 : -1).forEach((card, ind) => card.order = ind);
    state.cards.filter(c => c.location === toLocation).sort((a,b) => a.order > b.order ? 1 : -1).forEach((card, ind) => card.order = ind);
  }
};

// Compares locationA === locationB
// But locationB might not specify the playerNum, like: 'hand' === 'hand1' or 'hand2'
export const compareLocations = (locationA: TCardLocation, locationB: TCardAnyLocation) => {
  const locLen = locationB.length; // Size of the string comparisson
  const semiLocA = locationA.slice(0, locLen);
  return semiLocA === locationB;
}




// Destroy a card: Move it to its graveyard, and trigger all needed events
export const moveCardToGraveyard = (nextState: TGameState, gId: string, discard = false) => {
  const card = nextState.cards.find(c => c.gId === gId);
  if (!card) { return; }
  moveCard(nextState, gId, discard ? 'discarded' : 'grav');
  card.onDestroy(nextState);
  card.status = null;
  card.targets = [];

  // Find all enchantments targetting the card, and move them all to the graveyard too
  const tableStackCards = nextState.cards.filter(c => c.location === 'stack' || c.location.slice(0,4) === 'tble');
  const enchantments = tableStackCards.filter(c => c.type === 'enchantment' && c.targets.includes(gId));
  if (enchantments.length) { console.log(`${card.name} has ${enchantments.length} enchantments. These are destroyed too`); }
  enchantments.forEach(enchantment => moveCardToGraveyard(nextState, enchantment.gId));
}


// Check the amount of damage for every creature, and destroy them if needed
// If a creature gId is provided, it only checks this one
// It returns true if there are creatures that can be regenerated
export const killDamagedCreatures = (nextState: TGameState, gId?: string): boolean => {
  if (gId) { // Check the given creature
    const card = nextState.cards.find(c => c.gId === gId);
    if (card && ((card.turnDefense || 0) <= (card.turnDamage || 0))) {
      console.log(`Creature ${card.gId} ${card.name} (${card.turnAttack}/${card.turnDefense}) has received "${card.turnDamage}" points of damage ---> IT DIES (go to graveyard)`);
      killCreature(nextState, card.gId);
    }

  } else { // Check all creatures in the game (table + stack)
    const table = nextState.cards.filter(c => c.type === 'creature' && c.location.slice(0, 4) === 'tble');
    table.forEach(card => {
      if ((card.turnDefense || 0) <= (card.turnDamage || 0)) {
        console.log(`Creature ${card.gId} ${card.name} (${card.turnAttack}/${card.turnDefense}) has received "${card.turnDamage}" points of damage ---> IT DIES (go to graveyard)`);
        killCreature(nextState, card.gId);
      }
    });
  }
  return !!nextState.cards.find(c => c.canRegenerate && c.isDying);
}

export const killCreature = (nextState: TGameState, gId: string) => {
  const card = nextState.cards.find(c => c.gId === gId);
  if (card) {
    if (card.canRegenerate) {
      console.log(`Creature ${card.gId} ${card.name} is killed ---> But it can be regenerated`);
      card.isDying = true;
    } else {
      moveCardToGraveyard(nextState, card.gId);
    }
  }
};

export const drawCard = (nextState: TGameState, playerNum: '1' | '2') => {
  const deck = nextState.cards.filter(c => c.location === 'deck' + playerNum).sort((a, b) => a.order > b.order ? 1 : -1);
  if (deck.length > 1) {
    moveCard(nextState, deck[0].gId, 'hand');
  } else {
    endGame(nextState, playerNum); // No cards in the deck = you lose
  }
}

export const shuffleDeck = (nextState: TGameState, playerNum: '1' | '2') => {
  const deck = nextState.cards.filter(c => c.location === 'deck' + playerNum).sort((a, b) => a.order > b.order ? 1 : -1);
  deck.forEach(card => card.order = Math.round(Math.random() * 9999));
  deck.sort((a, b) => a.order > b.order ? 1 : -1).forEach((c, ind) => c.order = ind);
}

// Ends the game and sets the winner (player1win / player2win)
export const endGame = (nextState: TGameState, winner: '1' | '2') => {
  console.log('Player', winner, 'won the game');
  nextState.status = `player${winner}win`;
}



// Validates the mana in the mana pool to cast a card
// - 'not enough' = There not enough mana
// - 'exact' --> There is the exact mana
// - If there is more mana:
//    - 'auto' -> If all uncolored can be taken from the same source
//    - 'manual' -> If there are different colors to be used as uncolored (cherry picking)
export const checkMana = (cast: TCast, playerManaPool: TCast): 'not enough' | 'exact' | 'auto' | 'manual' => {
  const manaPool = [...playerManaPool] as TCast;
  for (let t = 1; t <= 5; t++) { manaPool[t] -= cast[t]; } // Subtract colored mana
  if (manaPool.some(m => m < 0)) { return 'not enough'; }  // Not enought colored mana
  if (cast[0] === 0) { return 'exact'; }                   // Enough colored mana (and 0 colorless)

  const sameColor = manaPool.filter(v => v).length === 1;
  const colorlessInPool = manaPool.reduce((a,v) => a + v, 0);
  if (colorlessInPool < cast[0]) { return 'not enough'; } // Not enough colorless mana
  if (colorlessInPool === cast[0]) { return 'exact'; }    // Exact colored and colorless mana
  if (sameColor) { return 'auto'; } // More mana, but of the same color
  return 'manual'; // More mana of different color
}


// Given a mana cost and a mana pool, determine whether the cost can be payed or not
// and provide the amounts to take from the pool to pay the cost
export const calcManaCost = (cost: TCast, pool: TCast, forUncolor: TCast = [0,0,0,0,0,0]): 
  { manaStatus: 'ok' | 'not enough' | 'needs selection',
    manaForColored: TCast,
    manaForUncolor: TCast,
    totalManaToUse: TCast,
    manaAvailable: TCast,
  } => {

  const manaForColored: TCast = [0,0,0,0,0,0];  // Mana to be used for colored cost
  const manaForUncolor: TCast = [0,0,0,0,0,0];  // Mana to be used for uncolored cost (cost[0])
  const totalManaToUse: TCast = [0,0,0,0,0,0];  // manaForColored[] + manaForUncolor[]
  const manaAvailable: TCast = [...pool];       // pool[] - totalManaToUse[]
  
  // Count colored mana
  for (let t = 1; t <= 5; t++) {
    manaAvailable[t] -= cost[t];
    manaForColored[t] += cost[t];
    totalManaToUse[t] += cost[t];
  }

  const totalAvailableForUncolor = manaAvailable.reduce((a,v) => a + v, 0); // Total mana available in the pool to be used for uncolored
  
  if (manaAvailable.some(m => m < 0)) { // Not enought colored mana
    return { manaStatus: 'not enough', manaForColored, manaForUncolor, totalManaToUse, manaAvailable: [...pool] }; 
  }
  
  if (cost[0] > totalAvailableForUncolor) { // Not enought uncolored mana
    return { manaStatus: 'not enough', manaForColored, manaForUncolor, totalManaToUse, manaAvailable: [...pool] }; 
  }

  if (cost[0] === totalAvailableForUncolor) { // Exact colored and colorless mana
    for (let t = 0; t <= 5; t++) {
      manaForUncolor[t] += manaAvailable[t];
      totalManaToUse[t] += manaAvailable[t];
    }
    return { manaStatus: 'ok', manaForColored, manaForUncolor, totalManaToUse, manaAvailable }; 
  }

  if (cost[0] < totalAvailableForUncolor) { // More mana available than needed

    // If there is only mana of 1 color left (auto) just take the needed amount from that pool
    if (manaAvailable.filter(v => v).length === 1) {
      const poolNum = manaAvailable.reduce((a, v, i) => v ? i : a, 0);
      manaForUncolor[poolNum] += cost[0];
      totalManaToUse[poolNum] += cost[0];
      return { manaStatus: 'ok', manaForColored, manaForUncolor, totalManaToUse, manaAvailable }; 
    }

    // Count the manaForUncolor selection
    for (let t = 0; t <= 5; t++) {
      manaAvailable[t] -= forUncolor[t];
      manaForUncolor[t] += forUncolor[t];
      totalManaToUse[t] += forUncolor[t];
    }
    if (manaAvailable.some(m => m < 0)) {
      console.error('wrong manaForUncolor', forUncolor);
      return { manaStatus: 'not enough', manaForColored, manaForUncolor, totalManaToUse, manaAvailable: [...pool] }; 
    }
    if (cost[0] === manaForUncolor.reduce((a,v) => a + v, 0)) { // Right mana using given selection
      return { manaStatus: 'ok', manaForColored, manaForUncolor, totalManaToUse, manaAvailable }; 
    }
    
  }
  
  // Manual selection (can't determine what pool we should take mana from)
  return { manaStatus: 'needs selection', manaForColored, manaForUncolor, totalManaToUse, manaAvailable }; 
};

// When the mana is exact or auto, you can calculate the right manaForUncolor[]
export const calcManaForUncolored = (cast: TCast, playerManaPool: TCast) => {
  const manaForUncolor = [0, 0, 0, 0, 0, 0] as TCast;
  const manaPool = [...playerManaPool] as TCast;
  for (let t = 1; t <= 5; t++) { manaPool[t] -= cast[t]; } // Subtract colored mana
  let uncoloredNeeded = cast[0];
  for (let t = 0; t <= 5; t++) {
    const manaToTake = Math.min(manaPool[t], uncoloredNeeded);
    manaForUncolor[t] += manaToTake;
    uncoloredNeeded -= manaToTake;
  }
  return manaForUncolor;
}

// Returns a player's mana pool minus all the mana cost + extra of the ongoing operations on the opStack[] that are > waitingMana
export const getAvailableMana = (nextState: TGameState, playerManaPool: TCast, gIdToExclude?: string): TCast => {
  const availableMana: TCast = [...playerManaPool];
  nextState.opStack.filter(op => op.gId !== gIdToExclude).forEach(op => {
    const opCard = nextState.cards.find(c => c.gId === op.gId);
    if (opCard && op.status !== 'waitingMana') { // Reserve only for those operations that have completed the waiting

      const opCost = op.opAction === 'summon' ? opCard.getSummonCost(nextState) : opCard.getAbilityCost(nextState);

      const manaCost: TCast = [...opCost?.mana || [0,0,0,0,0,0]];
      const { totalManaToUse } = calcManaCost(manaCost, availableMana, op.manaForUncolor);
      for (let t = 0; t <= 5; t++) { availableMana[t] -= totalManaToUse[t]; } // Subtract the reserved mana
      if (op.manaExtra) { for (let t = 0; t <= 5; t++) { availableMana[t] -= op.manaExtra[t]; }} // Substract extra reserved mana
    }
  });
  return availableMana;
};


// Decreases the manaPool[] as much as the cast needs with manaUsed
export const spendMana = (cast: TCast, manaPool: TCast, manaForUncolor: TCast = [0,0,0,0,0,0]) => {
  for (let t = 1; t <= 5; t++) { manaPool[t] -= cast[t]; }            // Subtract colored mana
  for (let t = 0; t <= 5; t++) { manaPool[t] -= manaForUncolor[t]; }  // Subtract uncolored mana
}

