import { Injectable } from '@angular/core';
import { EPhase, TAction, TCard, TCardLocation, TGameState, TGameDBState, TGameCard, TGameCards, TActionParams, TPlayer, TCardType, TCardSemiLocation, TCardAnyLocation, TCast, TGameOption, ESubPhase, TEffect } from '../../../../core/types';
import { compareLocations, getCards } from './game.utils';


@Injectable({ providedIn: 'root' })
export class GameOptionsService {
  constructor() {}

  // --------------------------- NEXT OPTIONS CALCULATIONS ----------------------------------

  // Calculates your possible options for a current state
  // It modifies/extends:
  //  - state.options[]
  //  - state.cards[].selectableAction
  //  - state.cards[].effectsFrom[] ---> Pointers to the state.effects[]
  calculate(dbState: TGameDBState, playerANum: '1' | '2'): TGameState {
    const state: TGameState = { ...dbState, options: [] };
    state.cards.forEach(card => card.selectableAction = null);  // Remove all actions (from prev state)
    state.player1.selectableAction = null;
    state.player2.selectableAction = null;


    const playerBNum = playerANum === '1' ? '2' : '1';
    const playerA = playerANum === '1' ? state.player1 : state.player2;
    const playerB = playerBNum === '1' ? state.player1 : state.player2;

    // const { hand, table } = this.getCards(state, 'playerA'); // Your cards
    const { handA, handB, tableA, tableB, tableStack } = getCards(state, playerANum);

    // Shortcut to check if the current phase is any of the given
    const isPhase = (...phases: string[]) => phases.includes(state.phase);    
    const isSubPhase = (...subPhases: string[]) => subPhases.includes(state.subPhase as ESubPhase);

    let canSkipPhase = true;

    if (state.control !== playerANum) { return state; } // If you don't have control, you have no options

    // If the game is not running
    if (state.status === 'created') { state.options.push({ action: 'start-game', params: {} }); return state; }
    if (state.status !== 'playing') { return state; } // in case someone's won



    const youMaySummonLands = () => {
      handA.filter(c => c.type === 'land').forEach(card => {
        const option: TGameOption = { action: 'summon-land', params: { gId: card.gId }, text: `Summon ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });
    }
    const youMaySummon = (type: TCardType) => {
      handA.filter(c => c.type === type).forEach(card => {
        const option: TGameOption = { action: 'summon-spell', params: { gId: card.gId }, text: `Summon ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });
    }

    // Use card abilities (paying the cost). This also includes tapping lands for mana
    // Cards that need to tap can only be tapped to use the ability if they are not
    // Creatures with regenerate can only be regenerated (use the ability) if they are dying
    const youMayTriggerAbilities = () => {
      tableA.filter(c => c.controller === playerANum).forEach(card => {        
        const abilityCost = card.getAbilityCost(state);
        if (abilityCost && (!abilityCost.tap || !card.isTapped) && (!card.canRegenerate || card.isDying)) {
          const option: TGameOption = { action: 'trigger-ability', params: { gId: card.gId }, text: abilityCost.text };
          card.selectableAction = option;
          state.options.push(option);
        }
      });
    };

 
    // Actions that you can do during both your turn or opponents turn:


    // SPELL STACK: You may summon instant/interrupt as a counter mesure from your opponent's action
    if (playerA.stackCall) { 
      youMaySummon('instant');  // You may summon instant spells (add them to the stack)
      youMayTriggerAbilities(); // You may use cards
      
      state.options.push({ action: 'release-stack', params: {}, text: `Continue` });  // You may finish the spell stack      

      if (state.cards.find(c => c.location === 'stack')) { youMaySummon('interruption'); } // You may summon interruptions

      return state; // <--- Exclusive Option: You can't do anything else
    } 
    
    
    // You may regenerate a dying creatures
    const yourRegCreatures = state.cards.filter(c => c.controller === playerANum && c.canRegenerate && c.isDying);
    const otherRegCreatures = state.cards.filter(c => c.controller !== playerANum && c.canRegenerate && c.isDying);

    // Player 1 starts regenerating creatures. If you are player 2, you can regenerate yours once the opponent is done
    if (yourRegCreatures.length && (playerANum === '1' || !otherRegCreatures.length)) {
      // yourRegCreatures.forEach(creature => {
      //   const params = { gId: creature.gId };
      //   // const option: TGameOption = { action: 'regenerate-creature', params, text: `Regenerate ${creature.name}` };
      //   const option: TGameOption = { action: 'trigger-ability', params, text: `Regenerate ${creature.name}` };
      //   creature.selectableAction = option;
      //   state.options.push(option);
      // });
      state.options.push({ action: 'cancel-regenerate', params: {}, text: `Cancel Regenerate and let creatures die` });
      youMayTriggerAbilities(); // You may tap lands and use cards too

      return state; // <--- Exclusive Option: You can't do anything else
    }




    if (state.turn !== playerANum) { // If it's not your turn, yet you have control (casting interruptions, defend from atack, ...)

      // COMBAT: Defending from an atack
      if (isPhase('combat') && state.subPhase === 'selectDefense') {
        state.options.push({ action: 'cancel-defense', params: {}, text: 'Reset you defending selection' });
        state.options.push({ action: 'submit-defense', params: {}, text: 'Defend with selected creatures' });

        // You may select a creature to defend your opponents attack
        tableA.filter(c => c.type === 'creature' && c.combatStatus !== 'combat:defending').forEach(card => {
          if (card.canDefend(state)) {
            const option: TGameOption = { action: 'select-defending-creature', params: { gId: card.gId }, text: `Defend with ${card.name}` };
            state.options.push(option);
            card.selectableAction = option;
          }
        });

        // You may select the opponent's attacking creature as a target of your defending creature
        const defenderToAssign = state.cards.find(c => c.combatStatus === 'combat:selectingTarget');
        if (defenderToAssign) {
          defenderToAssign.targetBlockers(state).forEach(attackingId => {
            const attackingCard = state.cards.find(c => c.gId === attackingId);
            if (attackingCard) {
              const params = { gId: defenderToAssign.gId, targets: [attackingId] };
              const option: TGameOption = { action: 'select-defending-creature', params, text: `Defend ${attackingCard.name} with ${defenderToAssign.name}` };
              state.options.push(option);
              attackingCard.selectableAction = option;
            }
          });
        }
      }


    } else if (state.turn === playerANum) { // Actions that can only be done during your turn

      // Casting / Summoning:

      if (isPhase('pre', 'post') && playerA.summonedLands === 0) { youMaySummonLands(); } // You may summon lands on hand
      
      if (isPhase('maintenance', 'draw', 'pre', 'combat', 'post')) { youMaySummon('instant'); }  // You may summon instant spells    
      
      if (isPhase('pre', 'post')) { youMaySummon('creature'); }     // You may summon creatures
      if (isPhase('pre', 'post')) { youMaySummon('artifact'); }     // You may summon artifacts
      if (isPhase('pre', 'post')) { youMaySummon('sorcery'); }      // You may summon sorceries
      if (isPhase('pre', 'post')) { youMaySummon('enchantment'); }  // You may summon enchantments
      

      // Tapping habilities:

      // You may tap lands to produce mana
      // You may trigger abilities on cards (tap to do something, or pay mana to do something)
      const spellsAvailable = handA.filter(c => c.type === 'instant').length > 0;
      if (isPhase('combat')) { // You may use cards abilities during combat
        if (isSubPhase('attacking', 'defending', 'afterCombat', 'regenerate')) { youMayTriggerAbilities(); }
      }
      else if (isPhase('pre', 'post')) { youMayTriggerAbilities(); } // You may use cards during your turn pre/post
      else if (spellsAvailable) { youMayTriggerAbilities(); } // You may tap lands if there are instants to summon


      // Combat
      if (isPhase('combat')) {
        const isAttackOn = !!tableA.filter(c => c.combatStatus === 'combat:attacking').length; // Are you leading an attack?

        if (state.subPhase === 'selectAttack') {
          tableA.filter(c => c.type === 'creature' && c.combatStatus !== 'combat:attacking').forEach(card => {
            if (card.canAttack(state)) {
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

    }
    return state;
  }


  calculateEffectsFrom(state: TGameState) {
    state.cards.forEach(card => {
      card.effectsFrom = state.effects.filter(effect => effect.targets.indexOf(card.gId) >= 0);
    });
  }


  calculateTargetsFrom(state: TGameState) {
    state.cards.forEach(card => {
      card.targetOf = state.cards.filter(t => t.targets.includes(card.gId));
      card.uniqueTargetOf = state.cards.filter(t => t.targets.length === 1 && t.targets[0] === card.gId);
    });
  }

}