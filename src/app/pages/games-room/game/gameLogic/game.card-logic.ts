import { TEffect, TGameCard, TGameState } from "../../../../core/types";
import { getCards, killDamagedCreatures, moveCard, moveCardToGraveyard, randomId, summonCreature } from "./game.utils";

export type TRunEvent = 'onSummon' | 'onTap' | 'onDestroy' | 'onDiscard' | 'onEffect' | 'onTargetLookup';
export type TRunEventParams = Partial<{ effectId?: string, isFake?: boolean }>;
export type TRunEventFn = (
  nextState: TGameState,
  gId: string,
  event: TRunEvent, 
  params?: TRunEventParams
) => void;


// ------------------------ SPECIFIC EVENTS for every CARD ------------------------

export const runEvent: TRunEventFn = (nextState, gId, event, params = {}) => {
  const card = nextState.cards.find(c => c.gId === gId);
  if (!card) { return; }
  if (!params.isFake) { console.log(`EXECUTING event ${event} for ${card.name} (${card.gId})`); }

  // Wrap common values and functions
  const { targetId, effect, effectTargetId, cardPlayer, table, stack, tableStack, commonLand, commonCreature } = (function() {
    const targetId = card.targets[0]; // code of the first target (playerX, gId, ...)
    const effect = nextState.effects.find(e => e.id === params.effectId);
    const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
    const cardPlayer = card.controller === '1' ? nextState.player1 : nextState.player2
    const { table, stack, tableStack } = getCards(nextState);

    const commonLand = (manaNum: 0|1|2|3|4|5) => {
      if (event === 'onTap') {
        if (card && !card.isTapped && card.location.slice(0,4) === 'tble') {
          cardPlayer.manaPool[manaNum] += 1;
          if (manaNum === 1) { cardPlayer.manaPool[manaNum] += 1; } // Blue x2
          card.isTapped = true;
        } 
      }
    }  
    const commonCreature = () => {
      if (event === 'onSummon') { summonCreature(nextState, gId); }
    }

    return { targetId, effect, effectTargetId, cardPlayer, table, stack, tableStack, commonLand, commonCreature };
  })();

  




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
  function c000001_Island()   { commonLand(1); } // 1 Blue Mana
  function c000002_Plains()   { commonLand(2); } // 1 White Mana
  function c000003_Swamp()    { commonLand(3); } // 1 Black Mana
  function c000004_Mountain() { commonLand(4); } // 1 Red Mana
  function c000005_Forest()   { commonLand(5); } // 1 Breen Mana


  function c000032_LightningBolt() {
    if (event === 'onTargetLookup' && card) {
      card.neededTargets = 1; // Target must be any playing creature + any player
      card.possibleTargets = tableStack.filter(c => c.type === 'creature').map(c => c.gId);
      card.possibleTargets.push('playerA');
      card.possibleTargets.push('playerB');
    }
    if (event === 'onSummon') {
      const targetCreature = tableStack.find(c => c.gId === targetId && c.type === 'creature');
      if      (targetId === 'player1') { nextState.player1.life -= 3; } // Deals 3 points of damage to player1
      else if (targetId === 'player2') { nextState.player2.life -= 3; } // Deals 3 points of damage to player2
      else if (targetCreature) { targetCreature.turnDamage += 3; } // Deals 3 points of damage to target creature
      moveCardToGraveyard(nextState, gId);
    }
  }

  function c000043_GiantGrowth() {
    if (event === 'onTargetLookup' && card) {
      card.neededTargets = 1; // Target must be any playing creature
      card.possibleTargets = tableStack.filter(c => c.type === 'creature').map(c => c.gId);
    }
    if (event === 'onSummon') {
      nextState.effects.push({ scope: 'turn', gId, targets: [targetId], id: randomId('e') });
      moveCardToGraveyard(nextState, gId);
    }
    if (event === 'onEffect') {
      const targetCreature = tableStack.find(c => c.gId === effectTargetId && c.type === 'creature');
      if (targetCreature) { // target must be a creature on the table or stack
        if (targetCreature.turnAttack)  { targetCreature.turnAttack  += 3; }
        if (targetCreature.turnDefense) { targetCreature.turnDefense += 3; }
      }
    }
  }

  function c000038_Counterspell() {
    if (event === 'onTargetLookup' && card) {
      card.neededTargets = 1; // Target must be a summoning card on the stack
      card.possibleTargets = stack.map(c => c.gId);
    }
    if (event === 'onSummon') {
      const targetCard = nextState.cards.find(c => c.gId === targetId && c.location === 'stack');
      if (targetCard) { moveCardToGraveyard(nextState, targetCard.gId); } // Remove the target from the stack (won't be executed)
      moveCardToGraveyard(nextState, gId); // Move counterspell to the graveyard too
    }
  }

  function c000025_BadMoon() {
    if (event === 'onSummon') {
      nextState.effects.push({ scope: 'permanent', gId, targets: [], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    }
    if (event === 'onEffect') { // Add +1/+1 to all black creatures in the game
      const blackCreatures = tableStack.filter(c => c.type === 'creature' && c.color === 'black');
      if (effect) { effect.targets = blackCreatures.map(c => c.gId); } // Update the effect with all the current black creatures
      blackCreatures.forEach(creature => {
        creature.turnAttack += 1;
        creature.turnDefense += 1;
      });
    }
  }

  function c000055_UnholyStrength() {
    if (event === 'onTargetLookup' && card) {
      card.neededTargets = 1; // Target must be any playing creature
      card.possibleTargets = tableStack.filter(c => c.type === 'creature').map(c => c.gId);
    }
    if (event === 'onSummon') {
      nextState.effects.push({ scope: 'permanent', gId, targets: [targetId], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    }
    if (event === 'onEffect') { // Add +2/+1 to target creature
      const targetCreature = tableStack.find(c => c.gId === effectTargetId && c.type === 'creature');
      if (targetCreature) {
        targetCreature.turnAttack += 2;
        targetCreature.turnDefense += 1;
      }
    }
    // if (event === 'onDestroy') {
    //   const targetCreature = tableStack.find(c => c.effectsFrom?.find(e => e.gId === gId));
    //   if (targetCreature) { targetCreature.turnDefense -= 1; targetCreature.turnAttack -= 2; }
    //   killDamagedCreatures(nextState, targetId); // It may happen that the damage is now > defense
    // }
  }  

  function c000057_Disenchantment() {
    if (event === 'onTargetLookup' && card) {
      card.neededTargets = 1; // Target must be any playing enchantment or artifact
      card.possibleTargets = tableStack.filter(c => c.type === 'enchantment' || c.type === 'artifact').map(c => c.gId);
    }
    if (event === 'onSummon') {
      const targetEnchantment = tableStack.find(c => c.gId === targetId && c.type === 'enchantment');
      if (targetEnchantment) {
        moveCardToGraveyard(nextState, targetEnchantment.gId); // Destroy the enchantment
        moveCardToGraveyard(nextState, gId); // Destroy Disenchantment too
      }
    }
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
  function c000056_WallofIce()             { commonCreature(); }



  // Pending to be coded......
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


}




