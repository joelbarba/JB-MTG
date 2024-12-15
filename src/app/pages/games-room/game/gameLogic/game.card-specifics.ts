import { randomId } from "../../../../core/common/commons";
import { TCast, TColor, TEffect, TGameCard, TGameState } from "../../../../core/types";
import { endGame, getCards, killDamagedCreatures, moveCard, moveCardToGraveyard } from "./game.utils";


// ------------------------ SPECIFIC EVENTS for every CARD ------------------------

export const extendCardLogic = (card: TGameCard): TGameCard => {
  const gId = card.gId;
  if (card.hasOwnProperty('onSummon')) { return card; }
  // The card object when extended is a reference of the nextState at the begining of the reducer
  // so it always points to the cards of the same state is passed on the functions.
  // But to be 100% pure, we should filter the object from the given nextState in every function --> const card = getCard(nextState);

  // Functions to exted: common values
  card.onSummon       = (nextState: TGameState) => { moveCard(nextState, gId, 'tble'); getCard(nextState).status = null; }
  card.onTap          = (nextState: TGameState) => { getCard(nextState).isTapped = true; }
  card.onDestroy      = (nextState: TGameState) => {};
  card.onDiscard      = (nextState: TGameState) => moveCard(nextState, gId, 'grav');
  card.onEffect       = (nextState: TGameState, effectId: string) => {};
  card.canAttack      = (nextState: TGameState) => true;
  card.canDefend      = (nextState: TGameState) => true;
  card.targetBlockers = (nextState: TGameState) => [];  // Returns a list of gId of the attacking creatues that can block
  card.getSummonCost  = (nextState: TGameState) => ({ mana: card.cast });
  card.getAbilityCost = (nextState: TGameState) => null;


  const getCard = (nextState: TGameState) => nextState.cards.find(c => c.gId === gId) || card;
  const getShorts = (nextState: TGameState) => {
    const card = getCard(nextState);
    const cardPlayer = card.controller === '1' ? nextState.player1 : nextState.player2;
    const targetId = card.targets[0]; // code of the first target (playerX, gId, ...)
    const { tableStack, table, stack, deck, hand, play, graveyard } = getCards(nextState, '1'); // Only none A/B groups allowed
    const noProtection = (c: TGameCard) => !c.colorProtection || card.color !== c.colorProtection; 
    const targetCreatures = () => tableStack.filter(c => c.type === 'creature').filter(noProtection);
    return { card, targetId, cardPlayer, noProtection, targetCreatures, table, stack, tableStack, deck, hand, play, graveyard };
  }


  const commonLand = (manaNum: 0|1|2|3|4|5) => {
    card.getSummonCost = () => ({ mana: card.cast, neededTargets: 0, possibleTargets: [] });
    card.getAbilityCost = () => ({ 
      mana: [0,0,0,0,0,0], tap: true,
      neededTargets: 0, possibleTargets: [], 
      text: `Tap ${card.name} to get 1 mana`,
    });
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
    card.getSummonCost = () => ({ mana: card.cast, neededTargets: 0, possibleTargets: [] });
    card.onSummon = (nextState: TGameState) => {
      const { card } = getShorts(nextState);
      moveCard(nextState, card.gId, 'tble');
      card.status = card.isHaste ? null : 'sickness';
      card.combatStatus = null;
    };
    card.canAttack = (nextState: TGameState) => {
      const { card } = getShorts(nextState);
      return card && !card.isTapped && card.status !== 'sickness' && !card.isWall;
    };
    card.canDefend = (nextState: TGameState) => {
      const { card } = getShorts(nextState);
      return card && !card.isTapped;
    };
    card.targetBlockers = (nextState: TGameState) => {
      const { card, table } = getShorts(nextState);
      if (!card || card.isTapped) { return []; };
      const defendingCard = card;
      return table.filter(c => c.combatStatus === 'combat:attacking')
        .filter(attackingCard => !attackingCard.colorProtection || attackingCard.colorProtection !== defendingCard.color)
        .filter(attackingCard => !attackingCard.isFlying || defendingCard.isFlying)
        .map(c => c.gId);
    };
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
    case 'c000023':  c000023_AncestralRecall();       break; // ok
    case 'c000024':  c000024_Armageddon();            break;
    case 'c000025':  c000025_BadMoon();               break; // ok
    case 'c000026':  c000026_BlackKnight();           break; // ok
    case 'c000027':  c000027_DarkRitual();            break; // ok
    case 'c000028':  c000028_DrudgeSkeletons();       break;
    case 'c000029':  c000029_Fork();                  break;
    case 'c000030':  c000030_HowlingMine();           break;
    case 'c000031':  c000031_HypnoticSpecter();       break;
    case 'c000032':  c000032_LightningBolt();         break; // ok
    case 'c000033':  c000033_ShivanDragon();          break; // ok
    case 'c000034':  c000034_TimeWalk();              break; // ok
    case 'c000035':  c000035_KirdApe();               break;
    case 'c000036':  c000036_GrayOrge();              break; // ok
    case 'c000037':  c000037_BrassMan();              break;
    case 'c000038':  c000038_Counterspell();          break; // ok
    case 'c000039':  c000039_CrawWurm();              break; // ok
    case 'c000040':  c000040_EarthElemental();        break; // ok
    case 'c000041':  c000041_ElvishArchers();         break; // ok
    case 'c000042':  c000042_FireElemental();         break; // ok
    case 'c000043':  c000043_GiantGrowth();           break; // ok
    case 'c000044':  c000044_GiantSpider();           break; // ok
    case 'c000045':  c000045_GoblinBalloonBrigade();  break;
    case 'c000046':  c000046_GraniteGargoyle();       break; // ok
    case 'c000047':  c000047_GrizzlyBears();          break; // ok
    case 'c000048':  c000048_HillGiant();             break; // ok
    case 'c000049':  c000049_HurloonMinotaur();       break; // ok
    case 'c000050':  c000050_IronrootTreefolk();      break; // ok
    case 'c000051':  c000051_LlanowarElves();         break;
    case 'c000052':  c000052_MonssGoblinRaiders();    break; // ok
    case 'c000053':  c000053_Ornithopter();           break; // ok
    case 'c000054':  c000054_SavannahLions();         break; // ok
    case 'c000055':  c000055_UnholyStrength();        break; // ok
    case 'c000056':  c000056_WallofIce();             break; // ok
    case 'c000057':  c000057_Disenchantment();        break; // ok
    case 'c000058':  c000058_Shatter();               break;
    case 'c000059':  c000059_Shatterstorm();          break;
    case 'c000060':  c000060_Disintegrate();          break;
    case 'c000061':  c000061_DemonicTutor();          break;
    case 'c000062':  c000062_EyeForAnEye();           break;
    case 'c000063':  c000063_IvoryTower();            break;
    case 'c000064':  c000064_ManaFlare();             break;
    case 'c000065':  c000065_Terror();                break;
    case 'c000066':  c000066_WarpArtifact();          break;
    case 'c000067':  c000067_Weakness();              break;
    case 'c000068':  c000068_WheelOfFortune();        break;
    case 'c000069':  c000069_WrathOfGod();            break;
    case 'c000070':  c000070_HowlFromBeyond();        break;
    default: console.warn('Card ID not found', card.id); 
  }


  // Common Lands
  function c000001_Island()   { commonLand(1); } // 1 Blue Mana
  function c000002_Plains()   { commonLand(2); } // 1 White Mana
  function c000003_Swamp()    { commonLand(3); } // 1 Black Mana
  function c000004_Mountain() { commonLand(4); } // 1 Red Mana
  function c000005_Forest()   { commonLand(5); } // 1 Breen Mana


  function c000032_LightningBolt() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = [ ...targetCreatures().map(c => c.gId), 'playerA', 'playerB'];
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetCreatures, targetId } = getShorts(nextState);
      const targetCreature = targetCreatures().find(c => c.gId === targetId);
      if      (targetId === 'player1') { nextState.player1.life -= 3; } // Deals 3 points of damage to player1
      else if (targetId === 'player2') { nextState.player2.life -= 3; } // Deals 3 points of damage to player2
      else if (targetCreature) { targetCreature.turnDamage += 3; } // Deals 3 points of damage to target creature
      moveCardToGraveyard(nextState, gId);
    };
  }

  function c000043_GiantGrowth() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = targetCreatures().map(c => c.gId); // Target must be any playing creature
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };    
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'turn', gId, targets: [targetId], id: randomId('e') });
      moveCardToGraveyard(nextState, gId);
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +3/+3 to target creature
      const { targetCreatures } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetCreature = targetCreatures().find(c => c.gId === effectTargetId);
      if (targetCreature) { // target must be a creature on the table or stack
        targetCreature.turnAttack  += 3;
        targetCreature.turnDefense += 3;
      }
    }
  }

  function c000038_Counterspell() {
    card.getSummonCost = (nextState: TGameState) => {
      const { stack, noProtection } = getShorts(nextState);
      const possibleTargets = stack.filter(noProtection).map(c => c.gId); // Target must be a spell in the stack
      return { mana: card.cast, neededTargets: 1, possibleTargets };
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
      const { targetCreatures } = getShorts(nextState);
      const blackCreatures = targetCreatures().filter(c => c.color === 'black');
      const effect = nextState.effects.find(e => e.id === effectId);
      if (effect) { effect.targets = blackCreatures.map(c => c.gId); } // Update the effect with all the current black creatures
      blackCreatures.forEach(creature => {
        creature.turnAttack  += 1;
        creature.turnDefense += 1;
      });

    }
  }

  function c000055_UnholyStrength() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = targetCreatures().map(c => c.gId); // Target must be any playing creature
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };        
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'permanent', gId, targets: [targetId], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +2/+1 to target creature
      const { targetCreatures } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetCreature = targetCreatures().find(c => c.gId === effectTargetId);
      if (targetCreature) {
        targetCreature.turnAttack += 2;
        targetCreature.turnDefense += 1;
      }
    };
  }  

  function c000057_Disenchantment() {
    card.getSummonCost = (nextState: TGameState) => {
      const { tableStack, noProtection } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => (c.type === 'enchantment' || c.type === 'artifact') && noProtection(c)).map(c => c.gId);
      return { mana: card.cast, neededTargets: 1, possibleTargets }; // Target must be any playing enchantment or artifact
    };       
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, targetId, noProtection } = getShorts(nextState);
      const targetCard = tableStack.filter(c => (c.type === 'enchantment' || c.type === 'artifact') && noProtection(c)).find(c => c.gId === targetId);
      if (targetCard) {
        moveCardToGraveyard(nextState, targetCard.gId); // Destroy the enchantment or artifact
        moveCardToGraveyard(nextState, gId); // Destroy Disenchantment too
      }
    };
  }

  function c000044_GiantSpider() {
    commonCreature(); 
    card.targetBlockers = (nextState: TGameState) => {
      const { card, table } = getShorts(nextState);
      if (!card || card.isTapped) { return []; }; // Does not fly, but can block flying creatures
      const defendingCard = card;
      return table
        .filter(c => c.combatStatus === 'combat:attacking')
        .filter(c => !c.colorProtection || c.colorProtection !== defendingCard.color)
        .map(c => c.gId); 
    };
  }

  function c000011_SolRing() {
    card.getAbilityCost = () => ({ 
      mana: [0,0,0,0,0,0], tap: true,
      neededTargets: 0, possibleTargets: [], 
      text: `Tap ${card.name} to add 2 colorless mana`,
    });
    card.onTap = (nextState: TGameState) => {
      const { card, cardPlayer } = getShorts(nextState);
      cardPlayer.manaPool[0] += 2;
      card.isTapped = true;
    };
  }


  // Moxes
  function moxCommon(colorNum: number, color: TColor) {
    card.getAbilityCost = () => ({ 
      mana: [0,0,0,0,0,0], tap: true,
      neededTargets: 0, possibleTargets: [], 
      text: `Tap ${card.name}`, // to add 1 ${color} mana 
    });
    card.onTap = (nextState: TGameState) => {
      const { card, cardPlayer } = getShorts(nextState);
      cardPlayer.manaPool[colorNum] += 1;
      card.isTapped = true;
    };
  }
  function c000010_MoxSapphire() { moxCommon(1, 'blue');  }
  function c000008_MoxPearl()    { moxCommon(2, 'white'); }
  function c000007_MoxJet()      { moxCommon(3, 'black'); }
  function c000009_MoxRuby()     { moxCommon(4, 'red');   }
  function c000006_MoxEmerald()  { moxCommon(5, 'green'); }

  function c000046_GraniteGargoyle() {
    commonCreature();
    card.getAbilityCost = () => ({
      mana: [0,0,0,0,1,0], tap: false,
      neededTargets: 0, possibleTargets: [], 
      text: `Pay 1 red mana to add +0/+1`,
    });
    card.onTap = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'turn', gId, targets: [], id: randomId('e') });
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +0/+1 to target creature
      const { card } = getShorts(nextState);
      card.turnDefense += 1;
    }
  }

  function c000033_ShivanDragon() {
    commonCreature();
    card.getAbilityCost = () => ({
      mana: [0,0,0,0,1,0], tap: false,
      neededTargets: 0, possibleTargets: [], 
      text: `Pay 1 red mana to add +1/+0`,
    });
    card.onTap = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'turn', gId, targets: [], id: randomId('e') });
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+0 to target creature
      const { card } = getShorts(nextState);
      card.turnAttack += 1;
    }
  }

  function c000027_DarkRitual() { 
    card.onSummon = (nextState: TGameState) => { // Adds 3 black mana
      getShorts(nextState).cardPlayer.manaPool[3] += 3;
      moveCardToGraveyard(nextState, gId); // Destroy Dark Ritual
    };
  }

  function c000023_AncestralRecall() {
    card.getSummonCost = (nextState: TGameState) => {
      const possibleTargets = ['playerA', 'playerB']; // Target must be a player
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetId, deck } = getShorts(nextState);

      const playerNum = targetId === 'player1' ? '1' : '2';
      const playerDeck = deck.filter(c => c.owner === playerNum);

      if (playerDeck.length <= 3) {
        const winner = targetId === 'player1' ? '2' : '1';
        endGame(nextState, winner);

      } else {
        moveCard(nextState, playerDeck[0].gId, 'hand');
        moveCard(nextState, playerDeck[1].gId, 'hand');
        moveCard(nextState, playerDeck[2].gId, 'hand');
      }
      moveCardToGraveyard(nextState, gId);
    };
  }

  function c000034_TimeWalk() {
    card.onSummon = (nextState: TGameState) => {
      const { cardPlayer } = getShorts(nextState);
      const target = 'player' + cardPlayer.num;
      nextState.effects.push({ scope: 'endTurn', gId, targets: [target], id: randomId('e') });
      moveCardToGraveyard(nextState, gId);
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +3/+3 to target creature
      const { cardPlayer } = getShorts(nextState);
      nextState.turn = cardPlayer.num;
      nextState.control = cardPlayer.num;
    }
  }

  function c000012_BlackLotus() {
    card.getAbilityCost = () => {
      const possibleTargets = [1, 2, 3, 4, 5].map(v => 'custom-color-' + v);
      return {
        mana: [0,0,0,0,0,0], tap: true,
        neededTargets: 3, possibleTargets, customDialog: 'black-lotus', // Targets will be the colors (1,2,3,4,5)
        text: `Tap to add 3 mana of any single color`
      }
    };
    card.onTap = (nextState: TGameState) => { // Adds 3 color mana (targets = selected colors)
      const { cardPlayer } = getShorts(nextState);
      card.targets.forEach(target => {
        const mana = Number.parseInt(target.split('custom-color-')[1]);
        cardPlayer.manaPool[mana] += 1;
      });
      card.customDialog = null;
      moveCardToGraveyard(nextState, gId);
    };
  }

  function c000018_Taiga() {
    card.getAbilityCost = () => {
      const possibleTargets = ['custom-color-4', 'custom-color-5'];
      return {
        mana: [0,0,0,0,0,0], tap: true,
        neededTargets: 1, possibleTargets, customDialog: 'taiga', // Target will be the color
        text: `Tap ${card.name} to get 1 mana`
      }
    };
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
        cardPlayer.manaPool[4] += 1;
        card.isTapped = true;
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
  function c000028_DrudgeSkeletons()       { commonCreature(); }
  function c000036_GrayOrge()              { commonCreature(); }
  function c000037_BrassMan()              { commonCreature(); }
  function c000045_GoblinBalloonBrigade()  { commonCreature(); }
  function c000047_GrizzlyBears()          { commonCreature(); }
  function c000048_HillGiant()             { commonCreature(); }
  function c000049_HurloonMinotaur()       { commonCreature(); }
  function c000050_IronrootTreefolk()      { commonCreature(); }
  function c000051_LlanowarElves()         { commonCreature(); }
  function c000056_WallofIce()             { commonCreature(); }



  // // Pending to be coded......
  function c000013_Bayou() {}
  function c000014_Badlands() {}
  function c000015_Plateau() {}
  function c000016_Savannah() {}
  function c000017_Scrubland() {}
  function c000019_TropicalIsland() {}
  function c000020_Tundra() {}
  function c000021_UndergroundSea() {}
  function c000022_VolcanicIsland() {}
  function c000024_Armageddon() {}
  function c000029_Fork() {}
  function c000030_HowlingMine() {}
  function c000031_HypnoticSpecter() {}  
  function c000035_KirdApe() {}
  function c000058_Shatter() {}
  function c000059_Shatterstorm() {}
  function c000060_Disintegrate() {}
  function c000061_DemonicTutor() {}
  function c000062_EyeForAnEye() {}
  function c000063_IvoryTower() {}
  function c000064_ManaFlare() {}
  function c000065_Terror() {}
  function c000066_WarpArtifact() {}
  function c000067_Weakness() {}
  function c000068_WheelOfFortune() {}
  function c000069_WrathOfGod() {}
  function c000070_HowlFromBeyond() {}

  return card;
}




