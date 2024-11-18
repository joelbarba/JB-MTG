import { TEffect, TGameCard, TGameState } from "../../../../core/types";
import { getCards, killDamagedCreatures, moveCard, moveCardToGraveyard, randomId, summonCreature } from "./game.utils";

export type TRunEvent = 'onSummon' | 'onTap' | 'onDestroy' | 'onDiscard' | 'onEffect' 
                      | 'onTargetLookup' 
                      | 'onInit'    // Whether it can be selected to attack at the combat phase
                      | 'canAttack' // Whether it can be selected to attack at the combat phase
                      | 'canDefed'  // Whether it can be selected to defend
                      | 'canBlock'  // Whether it can be selected to defend against an attacker (params = { attackingCreature })

// onTargetLookup = when summoning a card that requires 1 or more targets to be selected,
//                  this logic will fill the card.neededTargets and card.possibleTargets fields


export type TRunEventParams = Partial<{ effectId?: string, isFake?: boolean }>;
export type TRunEventFn = (
  nextState: TGameState,
  gId: string,
  event: TRunEvent, 
  params?: TRunEventParams
) => void;


// ------------------------ SPECIFIC EVENTS for every CARD ------------------------

export const extendCardLogic = (card: TGameCard): TGameCard => {
  const gId = card.gId;
  // The card object when extended is a reference of the nextState at the begining of the reducer
  // so it always points to the cards of the same state is passed on the functions.
  // But to be 100% pure, we should filter the object from the given nextState in every function --> const card = getCard(nextState);

  // Functions to exted: common values
  card.onSummon       = (nextState: TGameState) => {};
  card.onTap          = (nextState: TGameState) => {};
  card.onDestroy      = (nextState: TGameState) => {};
  card.onDiscard      = (nextState: TGameState) => { moveCard(nextState, gId, 'grav') };
  card.onEffect       = (nextState: TGameState, effectId: string) => {};
  card.onTargetLookup = (nextState: TGameState) => ({ neededTargets: 0, possibleTargets: [] });
  card.canAttack      = (nextState: TGameState) => true;
  card.canDefend      = (nextState: TGameState) => true;
  card.canBlock       = (nextState: TGameState) => [];


  const getCard = (nextState: TGameState) => nextState.cards.find(c => c.gId === gId) || card;
  const getShorts = (nextState: TGameState) => {
    const card = getCard(nextState);
    const cardPlayer = card.controller === '1' ? nextState.player1 : nextState.player2;
    const targetId = card.targets[0]; // code of the first target (playerX, gId, ...)
    return { card, targetId, cardPlayer, ...getCards(nextState) };
  }


  const commonLandTap = (manaNum: 0|1|2|3|4|5) => {
    card.onSummon = (nextState: TGameState) => {
      const { card, cardPlayer } = getShorts(nextState);
      if (card.location.slice(0,4) === 'hand' && cardPlayer.summonedLands < 1) {
        moveCard(nextState, gId, 'tble');
        cardPlayer.summonedLands += 1;
      }
    };
    card.onTap = (nextState: TGameState) => {
      const { card, cardPlayer } = getShorts(nextState);
      if (!card.isTapped && card.location.slice(0,4) === 'tble') {
        cardPlayer.manaPool[manaNum] += 1;
        card.isTapped = true;
      } 
    };
  }

  const commonCreature = () => {
    card.onSummon = (nextState: TGameState) => {
      summonCreature(nextState, gId);
    }
  }



  switch (card.id) {
    case 'c000001':  c000001_Island();                break; // ok
    case 'c000002':  c000002_Plains();                break; // ok
    case 'c000003':  c000003_Swamp();                 break; // ok
    case 'c000004':  c000004_Mountain();              break; // ok
    case 'c000005':  c000005_Forest();                break; // ok
    case 'c000006':  c000006_MoxEmerald();            break;
    case 'c000007':  c000007_MoxJet();                break;
    case 'c000008':  c000008_MoxPearl();              break;
    case 'c000009':  c000009_MoxRuby();               break;
    case 'c000010':  c000010_MoxSapphire();           break;
    case 'c000011':  c000011_SolRing();               break;
    case 'c000012':  c000012_BlackLotus();            break;
    case 'c000013':  c000013_Bayou();                 break;
    case 'c000014':  c000014_Badlands();              break;
    case 'c000015':  c000015_Plateau();               break;
    case 'c000016':  c000016_Savannah();              break;
    case 'c000017':  c000017_Scrubland();             break;
    case 'c000018':  c000018_Taiga();                 break;
    case 'c000019':  c000019_TropicalIsland();        break;
    case 'c000020':  c000020_Tundra();                break;
    case 'c000021':  c000021_UndergroundSea();        break;
    case 'c000022':  c000022_VolcanicIsland();        break;
    case 'c000023':  c000023_AncestralRecall();       break;
    case 'c000024':  c000024_Armageddon();            break;
    case 'c000025':  c000025_BadMoon();               break; // ok
    case 'c000026':  c000026_BlackKnight();           break;
    case 'c000027':  c000027_DarkRitual();            break;
    case 'c000028':  c000028_DrudgeSkeletons();       break;
    case 'c000029':  c000029_Fork();                  break;
    case 'c000030':  c000030_HowlingMine();           break;
    case 'c000031':  c000031_HypnoticSpecter();       break;
    case 'c000032':  c000032_LightningBolt();         break; // ok
    case 'c000033':  c000033_ShivanDragon();          break;
    case 'c000034':  c000034_TimeWalk();              break;
    case 'c000035':  c000035_HowlingMine();           break;
    case 'c000036':  c000036_GrayOrge();              break; // ok
    case 'c000037':  c000037_BrassMan();              break;
    case 'c000038':  c000038_Counterspell();          break; // ok
    case 'c000039':  c000039_CrawWurm();              break;
    case 'c000040':  c000040_EarthElemental();        break;
    case 'c000041':  c000041_ElvishArchers();         break;
    case 'c000042':  c000042_FireElemental();         break;
    case 'c000043':  c000043_GiantGrowth();           break; // ok
    case 'c000044':  c000044_GiantSpider();           break;
    case 'c000045':  c000045_GoblinBalloonBrigade();  break;
    case 'c000046':  c000046_GraniteGargoyle();       break;
    case 'c000047':  c000047_GrizzlyBears();          break;
    case 'c000048':  c000048_HillGiant();             break;
    case 'c000049':  c000049_HurloonMinotaur();       break;
    case 'c000050':  c000050_IronrootTreefolk();      break;
    case 'c000051':  c000051_LlanowarElves();         break;
    case 'c000052':  c000052_MonssGoblinRaiders();    break;
    case 'c000053':  c000053_Ornithopter();           break;
    case 'c000054':  c000054_SavannahLions();         break;
    case 'c000055':  c000055_UnholyStrength();        break;
    case 'c000056':  c000056_WallofIce();             break;
    case 'c000057':  c000057_Disenchantment();        break; // ok
    default: console.warn('Card ID not found', card.id); 
  }


  // Common Lands
  function c000001_Island()   { commonLandTap(1); } // 1 Blue Mana
  function c000002_Plains()   { commonLandTap(2); } // 1 White Mana
  function c000003_Swamp()    { commonLandTap(3); } // 1 Black Mana
  function c000004_Mountain() { commonLandTap(4); } // 1 Red Mana
  function c000005_Forest()   { commonLandTap(5); } // 1 Breen Mana


  function c000032_LightningBolt() {
    card.onTargetLookup = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => c.type === 'creature').map(c => c.gId);
      possibleTargets.push('playerA');
      possibleTargets.push('playerB');
      return { neededTargets: 1, possibleTargets }; // Target must be any playing creature + any player
    };
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, targetId } = getShorts(nextState);
      const targetCreature = tableStack.find(c => c.gId === targetId && c.type === 'creature');
      if      (targetId === 'player1') { nextState.player1.life -= 3; } // Deals 3 points of damage to player1
      else if (targetId === 'player2') { nextState.player2.life -= 3; } // Deals 3 points of damage to player2
      else if (targetCreature) { targetCreature.turnDamage += 3; } // Deals 3 points of damage to target creature
      moveCardToGraveyard(nextState, gId);
    };
  }

  function c000043_GiantGrowth() {
    card.onTargetLookup = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => c.type === 'creature').map(c => c.gId);
      return { neededTargets: 1, possibleTargets }; // Target must be any playing creature
    };
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'turn', gId, targets: [targetId], id: randomId('e') });
      moveCardToGraveyard(nextState, gId);
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +3/+3 to target creature
      const { tableStack } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetCreature = tableStack.find(c => c.gId === effectTargetId && c.type === 'creature');
      if (targetCreature) { // target must be a creature on the table or stack
        targetCreature.turnAttack  += 3;
        targetCreature.turnDefense += 3;
      }
    }
  }

  function c000038_Counterspell() {
    card.onTargetLookup = (nextState: TGameState) => {
      const { stack } = getShorts(nextState);
      return { neededTargets: 1, possibleTargets: stack.map(c => c.gId) }; // Target must be a spell in the stack
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      const targetCard = nextState.cards.find(c => c.gId === targetId && c.location === 'stack');
      if (targetCard) { moveCardToGraveyard(nextState, targetCard.gId); } // Remove the target from the stack (won't be executed)
      moveCardToGraveyard(nextState, gId); // Move counterspell to the graveyard too
    }
  }

  function c000025_BadMoon() {
    card.onSummon = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'permanent', gId, targets: [], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+1 to all black creatures
      const { tableStack } = getShorts(nextState);
      const blackCreatures = tableStack.filter(c => c.type === 'creature' && c.color === 'black');
      const effect = nextState.effects.find(e => e.id === effectId);
      if (effect) { effect.targets = blackCreatures.map(c => c.gId); } // Update the effect with all the current black creatures
      blackCreatures.forEach(creature => {
        creature.turnAttack  += 1;
        creature.turnDefense += 1;
      });

    }
  }

  function c000055_UnholyStrength() {
    card.onTargetLookup = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => c.type === 'creature').map(c => c.gId);
      return { neededTargets: 1, possibleTargets }; // Target must be any playing creature
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'permanent', gId, targets: [targetId], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +2/+1 to target creature
      const { tableStack } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetCreature = tableStack.find(c => c.gId === effectTargetId && c.type === 'creature');
      if (targetCreature) {
        targetCreature.turnAttack += 2;
        targetCreature.turnDefense += 1;
      }
    };
  }  

  function c000057_Disenchantment() {
    card.onTargetLookup = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => c.type === 'enchantment' || c.type === 'artifact').map(c => c.gId);
      return { neededTargets: 1, possibleTargets }; // Target must be any playing enchantment or artifact
    };
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, targetId } = getShorts(nextState);
      const targetCard = tableStack.find(c => c.gId === targetId && (c.type === 'enchantment' || c.type === 'artifact'));
      if (targetCard) {
        moveCardToGraveyard(nextState, targetCard.gId); // Destroy the enchantment or artifact
        moveCardToGraveyard(nextState, gId); // Destroy Disenchantment too
      }
    };

  }

  // Common Creatures
  function c000052_MonssGoblinRaiders()    { commonCreature(); }
  function c000053_Ornithopter()           { commonCreature(); }
  function c000054_SavannahLions()         { commonCreature(); }
  function c000039_CrawWurm()              { commonCreature(); }
  function c000040_EarthElemental()        { commonCreature(); }
  function c000041_ElvishArchers()         { commonCreature(); }
  function c000042_FireElemental()         { commonCreature(); }
  function c000026_BlackKnight()           { commonCreature(); }
  function c000027_DarkRitual()            { commonCreature(); }
  function c000028_DrudgeSkeletons()       { commonCreature(); }
  function c000036_GrayOrge()              { commonCreature(); }
  function c000037_BrassMan()              { commonCreature(); }
  function c000044_GiantSpider()           { commonCreature(); }
  function c000045_GoblinBalloonBrigade()  { commonCreature(); }
  function c000046_GraniteGargoyle()       { commonCreature(); }
  function c000047_GrizzlyBears()          { commonCreature(); }
  function c000048_HillGiant()             { commonCreature(); }
  function c000049_HurloonMinotaur()       { commonCreature(); }
  function c000050_IronrootTreefolk()      { commonCreature(); }
  function c000051_LlanowarElves()         { commonCreature(); }
  function c000056_WallofIce()             { 
    // // commonCreature(); 
    // if (card && event === 'onInit') {
    //   card.canAttack = (state: TGameState) => {
    //     return false;
    //   }
    // }
    // if (event === 'onSummon') { summonCreature(nextState, gId); }
  }



  // // Pending to be coded......
  function c000006_MoxEmerald() {}
  function c000007_MoxJet() {}
  function c000008_MoxPearl() {}
  function c000009_MoxRuby() {}
  function c000010_MoxSapphire() {}
  function c000011_SolRing() {}
  function c000012_BlackLotus() {}
  function c000013_Bayou() {}
  function c000014_Badlands() {}
  function c000015_Plateau() {}
  function c000016_Savannah() {}
  function c000017_Scrubland() {}
  function c000018_Taiga() {}
  function c000019_TropicalIsland() {}
  function c000020_Tundra() {}
  function c000021_UndergroundSea() {}
  function c000022_VolcanicIsland() {}
  function c000023_AncestralRecall() {}
  function c000024_Armageddon() {}
  function c000029_Fork() {}
  function c000030_HowlingMine() {}
  function c000031_HypnoticSpecter() {}
  function c000033_ShivanDragon() {}
  function c000034_TimeWalk() {}
  function c000035_HowlingMine() {}

  return card;
}




