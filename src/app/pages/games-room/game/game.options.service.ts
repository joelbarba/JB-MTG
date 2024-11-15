import { Injectable } from '@angular/core';
import { EPhase, TAction, TCard, TCardLocation, TGameState, TGameDBState, TGameCard, TGameCards, TActionParams, TPlayer, TCardType, TCardSemiLocation, TCardAnyLocation, TCast, TGameOption, ESubPhase, TEffect } from '../../../core/types';
import { compareLocations } from './gameLogic/game.utils';
import { runEvent } from './gameLogic/game.card-logic';


@Injectable({ providedIn: 'root' })
export class GameOptionsService {
  constructor() {}

  // Shortcut for state objects (cards split on locations)
  getCards(state: TGameState, playerANum: '1' | '2') {
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
    return { deck,  hand,  table,  play,  graveyard,
             deckA, handA, tableA, playA, graveyardA, 
             deckB, handB, tableB, playB, graveyardB };
  }

  // --------------------------- NEXT OPTIONS CALCULATIONS ----------------------------------

  // Calculates your possible options for a current state
  // It modifies/extends:
  //  - state.options[]
  //  - state.cards[].selectableAction
  //  - state.cards[].selectableTarget
  //  - state.cards[].effectsFrom[] ---> Pointers to the state.effects[]
  calculate(dbState: TGameDBState, playerANum: '1' | '2'): TGameState {
    const state: TGameState = { ...dbState, options: [] };
    state.cards.forEach(card => { card.selectableAction = null; card.selectableTarget = null });  // Remove all actions (from prev state)
    state.player1.selectableAction = null; state.player1.selectableTarget = null;
    state.player2.selectableAction = null; state.player2.selectableTarget = null;

    const playerBNum = playerANum === '1' ? '2' : '1';
    const playerA = playerANum === '1' ? state.player1 : state.player2;
    const playerB = playerBNum === '1' ? state.player1 : state.player2;

    // const { hand, table } = this.getCards(state, 'playerA'); // Your cards
    const { handA, handB, tableA, tableB } = this.getCards(state, playerANum);

    // Shortcut to check if the current phase is any of the given
    const isPhase = (...phases: string[]) => phases.includes(state.phase);    

    let canSkipPhase = true;

    if (state.control !== playerANum) { return state; } // If you don't have control, you have no options

    // If the game is not running
    if (state.status === 'created') { state.options.push({ action: 'start-game', params: {} }); return state; }
    if (state.status !== 'playing') { return state; } // in case someone's won




    // Actions that you can do during both your turn or opponents turn
    
    // TARGET SELECTION: If you have a summoning operation, let it cancel
    const summonCard = handA.find(c => c.status?.slice(0, 7) === 'summon:');
    if (summonCard) { state.options.push({ action: 'cancel-summon', params: {}, text: 'Cancel ' + summonCard.name }); }
    
    const playingCard = state.cards.find(c => c.status === 'summon:selectingTargets');
    if (playingCard) {  // Selecting target
      runEvent(state, playingCard.gId, 'onTargetLookup');
      playingCard.possibleTargets.forEach(target => {
        if (target === 'playerA') {
          state.options.push({ action: 'summon-spell', params: { gId: playingCard.gId, targets: ['player' + playerANum] }});
          state.player1.selectableTarget = { text: `Select target player ${state.player1.name}`, value: 'player' + playerANum };

        } else if (target === 'playerB') {
          state.options.push({ action: 'summon-spell', params: { gId: playingCard.gId, targets: ['player' + playerBNum] }});
          state.player1.selectableTarget = { text: `Select target player ${state.player1.name}`, value: 'player' + playerBNum };            

        } else { // Card target
          const targetCard = state.cards.find(c => c.gId === target);
          if (targetCard) {
            targetCard.selectableTarget = { text: `Select target ${targetCard.name}`, value: targetCard.gId };
            state.options.push({ action: 'summon-spell', params: { gId: playingCard.gId, targets: [targetCard.gId] } });
          }
        }
      });
      return state; // <---- Avoid any other action when selecting a target
    }


    // Actions that you can do during both your turn or opponents turn:

    // SPELL STACK: You may summon instant/interrupt as a counter mesure from your opponent's action
    if (playerA.stackCall) { 

      // You may finish the spell stack
      state.options.push({ action: 'release-stack', params: {}, text: `Continue` }); 

      // You may tap lands to produce mana
      tableA.filter(c => c.type === 'land' && !c.isTapped).forEach(card => {
        const option: TGameOption = { action: 'tap-land', params: { gId: card.gId }, text: `Tap ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });

      // You may summon instant spells (add them to the stack)
      handA.filter(c => c.type === 'instant').forEach(card => {
        const option: TGameOption = { action: 'summon-spell', params: { gId: card.gId }, text: `Cast ${card.name}` };
        state.options.push(option);
        if (!card.status) { card.selectableAction = option; }
      });

      // You may summon interruptions (add them to the stack)
      if (state.cards.find(c => c.location === 'stack')) {
        handA.filter(c => c.type === 'interruption').forEach(card => {
          const option: TGameOption = { action: 'summon-spell', params: { gId: card.gId }, text: `Interrupt spell with ${card.name}` };
          state.options.push(option);
          if (!card.status) { card.selectableAction = option; }
        });
      }
      return state; // <---- Skip generic options (it's not your turn)
    }


    // If it's not your turn, yet you have control (casting interruptions, defend from atack, ...)
    if (state.turn !== playerANum) {

      // COMBAT: Defending from an atack
      if (isPhase('combat') && state.subPhase === 'selectDefense') {
        state.options.push({ action: 'cancel-defense', params: {}, text: 'Reset you defending selection' });
        state.options.push({ action: 'submit-defense', params: {}, text: 'Defend with selected creatures' });

        // You may select a creature to defend your opponents attack
        tableA.filter(c => c.type === 'creature' && !c.isTapped && c.status !== 'combat:defending').forEach(card => {
          const option: TGameOption = { action: 'select-defending-creature', params: { gId: card.gId }, text: `Defend with ${card.name}` };
          state.options.push(option);
          card.selectableAction = option;
        });

        // You may select the opponent's attacking creature as a target of your defending creature
        const defenderToAssign = state.cards.find(c => c.status === 'combat:selectingTarget');
        if (defenderToAssign) {
          tableB.filter(c => c.status === 'combat:attacking').forEach(card => {
            const params = { gId: defenderToAssign.gId, targets: [card.gId] };
            const option: TGameOption = { action: 'select-defending-creature', params, text: `Defend ${card.name} with ${defenderToAssign.name}` };
            state.options.push(option);
            card.selectableAction = option;
          });
        }
      }

      return state; // <---- Skip generic options (it's not your turn)
    }









    // Casting / Summoning:

    // You may summon lands on hand
    if (isPhase('pre', 'post') && playerA.summonedLands === 0) {
      handA.filter(c => c.type === 'land').forEach(card => {
        const option: TGameOption = { action: 'summon-land', params: { gId: card.gId }, text: `Summon ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });
    }

    // You may summon creatures
    if (isPhase('pre', 'post')) {
      handA.filter(c => c.type === 'creature').forEach(card => {
        const option: TGameOption = { action: 'summon-creature', params: { gId: card.gId }, text: `Summon ${card.name}` };
        state.options.push(option);
        if (!card.status) { card.selectableAction = option; }
      });
    }

    // You may summon enchantments
    if (isPhase('pre', 'post')) {
      handA.filter(c => c.type === 'enchantment').forEach(card => {
        const option: TGameOption = { action: 'summon-spell', params: { gId: card.gId }, text: `Cast ${card.name}` };
        state.options.push(option);
        if (!card.status) { card.selectableAction = option; }
      });
    }

    // You may summon sorceries
    if (isPhase('pre', 'post')) {
      handA.filter(c => c.type === 'sorcery').forEach(card => {
        const option: TGameOption = { action: 'summon-spell', params: { gId: card.gId }, text: `Cast ${card.name}` };
        state.options.push(option);
        if (!card.status) { card.selectableAction = option; }
      });
    }

    // You may summon instant spells
    if (isPhase('maintenance', 'draw', 'pre', 'combat', 'post')) {
      handA.filter(c => c.type === 'instant').forEach(card => {
        const option: TGameOption = { action: 'summon-spell', params: { gId: card.gId }, text: `Cast ${card.name}` };
        state.options.push(option);
        if (!card.status) { card.selectableAction = option; }
      });
    }

    

    // Tapping habilities:

    // You may tap lands to produce mana
    const spellsAvailable = handA.filter(c => c.type === 'instant').length > 0;
    if (isPhase('pre', 'post') || spellsAvailable) {
      tableA.filter(c => c.type === 'land' && !c.isTapped).forEach(card => {
        const option: TGameOption = { action: 'tap-land', params: { gId: card.gId }, text: `Tap ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });
    }


    // Combat
    if (isPhase('combat')) {
      const isAttackOn = !!tableA.filter(c => c.status === 'combat:attacking').length; // Are you leading an attack?

      if (state.subPhase === 'selectAttack') {
        tableA.filter(c => c.type === 'creature' && !c.isTapped && c.status !== 'sickness').forEach(card => {
          if (card.status !== 'combat:attacking') {
            const option: TGameOption = { action: 'select-attacking-creature', params: { gId: card.gId }, text: `Attack with ${card.name}` };
            state.options.push(option);
            card.selectableAction = option;
          }
        });

        // If you have selected attacking creatures, you may submit the attack
        if (isAttackOn) { 
          state.options.push({ action: 'cancel-attack', params: {}, text: 'Cancel the current attacking selection' });
          state.options.push({ action: 'submit-attack', params: {}, text: 'Attack with selected creatures' });
        }
      }

      // If ongoing combat, you can't skip to the next phase, you need to finish with the combat
      if (isAttackOn) { canSkipPhase = false; }
    }

    // Common turn actions:
    
    // You may untap cards
    if (isPhase('untap')) {
      if (tableA.filter(c => c.isTapped).length) { state.options.push({ action: 'untap-all', params: {}, text: `Untap all your cards` }); }
      tableA.filter(c => c.isTapped).forEach(card => {
        const option: TGameOption = { action: 'untap-card', params: { gId: card.gId }, text: `Untap ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });    
    }

    // You may draw a card
    if (isPhase('draw') && playerA.drawnCards < 1) {
      state.options.push({ action: 'draw', params: {}, text: `Draw a card from your library` });
      canSkipPhase = false; // Player must draw
    }

    // You may discard a card
    if (isPhase('discard') && handA.length > 7) {
      canSkipPhase = false; // Player must discard if more than 7 cards on the hand
      handA.forEach(card => {
        const option: TGameOption = { action: 'select-card-to-discard', params: { gId: card.gId }, text: `Discard ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });
    }

    // You may burn unspent mana
    if (isPhase('end') && playerA.manaPool.some(m => m > 0)) {
      canSkipPhase = false;  // Player must burn unspent mana
      state.options.push({ action: 'burn-mana', params: {} });
    }

    // You may do nothing (skip phase)
    if (canSkipPhase) {
      state.options.push({ action: 'skip-phase', params: {} });
    }


    return state;
  }


  calculateEffectsFrom(state: TGameState) {
    // state.cards.forEach(card => {
    //   card.effectsFrom = state.effects
    //     .filter(effect => effect.targets.indexOf(card.gId) >= 0)
    //     .map(effect => ({ ...effect, card: state.cards.find(c => c.gId === effect.gId) } as TEffect));
    // });
    state.cards.forEach(card => {
      card.effectsFrom = state.effects.filter(effect => effect.targets.indexOf(card.gId) >= 0);
    });
  }

}