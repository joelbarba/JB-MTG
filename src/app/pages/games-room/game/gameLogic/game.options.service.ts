import { Injectable } from '@angular/core';
import { TGameState, TGameDBState, TCardType, TGameOption, ESubPhase } from '../../../../core/types';
import { getCards } from './game.utils';


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
    const { handA, tableA, stack, unresolvedUpkeeps } = getCards(state, playerANum);

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
      handA.filter(c => c.isType(type) && !c.canPreventDamage).forEach(card => {
        const option: TGameOption = { action: 'summon-spell', params: { gId: card.gId }, text: `Summon ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });
    }
    const youMaySummonDamagePrevention = () => {
      handA.filter(c => c.isType('instant') && c.canPreventDamage).forEach(card => {
        const option: TGameOption = { action: 'summon-spell', params: { gId: card.gId }, text: `Summon ${card.name}` };
        state.options.push(option);
        card.selectableAction = option;
      });
    }

    // Use card abilities (paying the cost). This also includes tapping lands for mana
    // Cards that need to tap can only be tapped to use the ability if they are not
    // Creatures with regenerate can only be regenerated (use the ability) if they are dying
    const youMayTriggerAbilities = () => {
      tableA.filter(c => c.controller === playerANum && c.status !== 'sickness').forEach(card => {        
        const abilityCost = card.getAbilityCost(state);
        let canUseAbility = !!abilityCost; // If there is ability cost, the card has an ability that can be used

        if (abilityCost?.tap && card.isTapped) { canUseAbility = false; } // If it requires tap, and it's already tapped

        if (card.turnCanRegenerate === false) { canUseAbility = false; } // If you can't regenerate this turn
        if (card.turnCanRegenerate === true && !card.isDying) { canUseAbility = false; } // Can only use the regenerate abilty if dying

        if (abilityCost && canUseAbility) {
          const option: TGameOption = { action: 'trigger-ability', params: { gId: card.gId }, text: abilityCost.text };
          card.selectableAction = option;
          state.options.push(option);
        }
      });
    };

 

    // ------------------------------------------------------------------------------------------------------------------

    // Actions that you can do during both your turn or opponents turn:


    // When showing damage or life changes
    if (state.lifeChanges.length && state.lifeChanges[0].player === playerANum ) {

      // If you can cast spells that prevent damage (Reverse Damage / Eye for an Eye), let it do stuff
      if (handA.filter(c => c.isType('instant') && c.canPreventDamage).length) {
        youMaySummonDamagePrevention(); // You may summon instant spells that prevent damage
        youMaySummon('instant');
        youMayTriggerAbilities();
        if (state.cards.find(c => c.location === 'stack')) { youMaySummon('interruption'); } // You may summon interruptions 
      }

      // If you are playing a preventing damage on the stack and want to fork it, allow it too
      if (!!stack.find(c => c.canPreventDamage) && handA.filter(c => c.allowMultiCast)) {
        youMaySummonDamagePrevention(); // You may summon instant spells that prevent damage
        youMaySummon('instant');
        youMayTriggerAbilities();
        youMaySummon('interruption');
        state.options.push({ action: 'release-stack', params: {}, text: `Continue` });  // You may finish the spell stack
      }

      state.options.push({ action: 'acknowledge-life-change', params: {}, text: `Ok` }); // You might just acknowledge it
      return state; // <--- Exclusive Option: You can't do anything else
    }

    // SPELL STACK: You may summon instant/interrupt as a counter mesure from your opponent's action
    if (playerA.stackCall) { 
      youMaySummon('instant');  // You may summon instant spells (add them to the stack)
      youMayTriggerAbilities(); // You may use cards
      if (state.cards.find(c => c.location === 'stack')) { youMaySummon('interruption'); } // You may summon interruptions      

      state.options.push({ action: 'release-stack', params: {}, text: `Continue` });  // You may finish the spell stack      
      return state; // <--- Exclusive Option: You can't do anything else
    } 
    
    
    // You may regenerate a dying creatures
    const yourRegCreatures = state.cards.filter(c => c.controller === playerANum && c.turnCanRegenerate && c.isDying);
    const otherRegCreatures = state.cards.filter(c => c.controller !== playerANum && c.turnCanRegenerate && c.isDying);

    // Player 1 starts regenerating creatures. If you are player 2, you can regenerate yours once the opponent is done
    if (yourRegCreatures.length && (playerANum === '1' || !otherRegCreatures.length)) {
      state.options.push({ action: 'cancel-regenerate', params: {}, text: `Cancel Regenerate and let creatures die` });
      youMayTriggerAbilities(); // You may tap lands and use cards too
      return state; // <--- Exclusive Option: You can't do anything else
    }


    // Combat actions
    if (isPhase('combat')) {

      // You may play spells during combat non selecting subphases
      if (isSubPhase('attacking', 'beforeDamage', 'afterDamage', 'regenerate')) {
        youMayTriggerAbilities();
        youMaySummon('instant');
        youMaySummon('interruption');
        state.options.push({ action: 'continue-combat', params: {}, text: 'Continue' });  // You may skip combat subphase
      }


      if (state.turn === playerANum) {  // You can lead an attack if it's your turn

        const isAttackOn = !!tableA.filter(c => c.combatStatus === 'combat:attacking').length; // Are you leading an attack?

        if (state.subPhase === 'selectAttack') {  // You may select a creature to attack
          tableA.filter(c => c.isType('creature') && c.combatStatus !== 'combat:attacking').forEach(card => {
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


      } else if (state.turn !== playerANum && isSubPhase('selectDefense')) { // If it's not your turn, you can still select a defense

        // COMBAT: Defending from an atack
        state.options.push({ action: 'cancel-defense', params: {}, text: 'Reset you defending selection' });
        state.options.push({ action: 'submit-defense', params: {}, text: 'Defend with selected creatures' });

        // You may select a creature to defend your opponents attack
        tableA.filter(c => c.isType('creature') && c.combatStatus !== 'combat:defending').forEach(card => {
          if (card.canDefend(state) && card.targetBlockers(state).length) {
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
    }
    
    

    if (state.turn === playerANum) { // Actions that can only be done during your turn

      // Casting / Summoning:

      if (isPhase('pre', 'post') && playerA.summonedLands === 0) { youMaySummonLands(); } // You may summon lands on hand
     
      if (isPhase('pre', 'post')) { youMaySummon('instant'); }      // You may summon instant spells
      if (isPhase('pre', 'post')) { youMaySummon('creature'); }     // You may summon creatures
      if (isPhase('pre', 'post')) { youMaySummon('artifact'); }     // You may summon artifacts
      if (isPhase('pre', 'post')) { youMaySummon('sorcery'); }      // You may summon sorceries
      if (isPhase('pre', 'post')) { youMaySummon('enchantment'); }  // You may summon enchantments
      

      // Tapping habilities:

      if (isPhase('pre', 'post')) { youMayTriggerAbilities(); } // You may use cards during your turn pre/post


      
      // You may untap cards
      if (isPhase('untap')) {
        const cardsToUntap = tableA.filter(c => c.isTapped && c.canUntap(state));
        if (cardsToUntap.length) { state.options.push({ action: 'untap-all', params: {}, text: `Untap all your cards` }); }
        cardsToUntap.forEach(card => {
          const option: TGameOption = { action: 'untap-card', params: { gId: card.gId }, text: `Untap ${card.name}` };
          state.options.push(option);
          card.selectableAction = option;
        });    
      }

      if (isPhase('upkeep')) {
        if (unresolvedUpkeeps.length) { 
          const upkeepItem = unresolvedUpkeeps[0];
          state.options.push({ action: 'pay-upkeep',  params: { gId: upkeepItem.gId }, text: upkeepItem.text });
          state.options.push({ action: 'skip-upkeep', params: { gId: upkeepItem.gId }, text: upkeepItem.text });
          youMayTriggerAbilities();
          youMaySummon('instant');
          canSkipPhase = false;
        }
      }

      // You may draw a card
      if (isPhase('draw') && playerA.turnDrawnCards < 1) {
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