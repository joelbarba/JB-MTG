import { randomId } from "../../../../core/common/commons";
import { TCast, TColor, TEffect, TGameCard, TGameState } from "../../../../core/types";
import { endGame, getCards, killCreature, killDamagedCreatures, moveCard, moveCardToGraveyard } from "./game.utils";


// ------------------------ SPECIFIC EVENTS for every CARD ------------------------

export const extendCardLogic = (card: TGameCard): TGameCard => {
  const gId = card.gId;
  if (card.hasOwnProperty('onSummon')) { return card; }
  // The card object when extended is a reference of the nextState at the begining of the reducer
  // so it always points to the cards of the same state is passed on the functions.
  // But to be 100% pure, we should filter the object from the given nextState in every function --> const card = getCard(nextState);

  // Functions to exted: common values
  card.onSummon       = (nextState: TGameState) => { moveCard(nextState, gId, 'tble'); getCard(nextState).status = null; }
  card.onAbility      = (nextState: TGameState) => { getCard(nextState).isTapped = true; }
  card.onDestroy      = (nextState: TGameState) => {};
  card.onDiscard      = (nextState: TGameState) => moveCard(nextState, gId, 'grav');
  card.afterCombat    = (nextState: TGameState) => {};
  card.onEffect       = (nextState: TGameState, effectId: string) => {};
  card.canAttack      = (nextState: TGameState) => true;
  card.canDefend      = (nextState: TGameState) => true;
  card.targetBlockers = (nextState: TGameState) => [];  // Returns a list of gId of the attacking creatues that can block
  card.getSummonCost  = (nextState: TGameState) => ({ mana: card.cast });
  card.getAbilityCost = (nextState: TGameState) => null;
  card.isType         = (type) => card.type === type;
  card.isColor        = (color) => card.color === color;

  const getCard = (nextState: TGameState) => nextState.cards.find(c => c.gId === gId) || card;
  const getShorts = (nextState: TGameState) => {
    const card = getCard(nextState);
    const cardPlayer = card.controller === '1' ? nextState.player1 : nextState.player2;
    const otherPlayer = card.controller === '1' ? nextState.player2 : nextState.player1;
    const targetId = card.targets[0]; // code of the first target (playerX, gId, ...)
    const { tableStack, table, stack, deck, hand, play, graveyard } = getCards(nextState, '1'); // Only none A/B groups allowed
    const noProtection = (c: TGameCard) => !c.colorProtection || card.color !== c.colorProtection; 
    const targetCreatures = () => tableStack.filter(c => c.type === 'creature').filter(noProtection);
    return { card, targetId, cardPlayer, otherPlayer, noProtection, targetCreatures, table, stack, tableStack, deck, hand, play, graveyard };
  }


  const commonLand = (manaNum: 0|1|2|3|4|5) => {
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
    card.onAbility = (nextState: TGameState) => {
      const { card, cardPlayer } = getShorts(nextState);
      if (!card.isTapped && card.location.slice(0,4) === 'tble') {
        cardPlayer.manaPool[manaNum] += 1;
        card.isTapped = true;
      } 
    };    
  }

  const commonCreature = () => {
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

  const addRegenerateAbility = () => {
    card.onAbility = (nextState: TGameState) => {
      if (card.isDying) {
        card.turnDamage = 0;
        card.isDying = false;
        nextState.control = nextState.turn; // Return control to the turn player
      }
    };
  }





  switch (card.id) {
    case 'c000001':  c000001_Island();                    break; // ok
    case 'c000002':  c000002_Plains();                    break; // ok
    case 'c000003':  c000003_Swamp();                     break; // ok
    case 'c000004':  c000004_Mountain();                  break; // ok
    case 'c000005':  c000005_Forest();                    break; // ok
    case 'c000006':  c000006_MoxEmerald();                break; // ok
    case 'c000007':  c000007_MoxJet();                    break; // ok
    case 'c000008':  c000008_MoxPearl();                  break; // ok
    case 'c000009':  c000009_MoxRuby();                   break; // ok
    case 'c000010':  c000010_MoxSapphire();               break; // ok
    case 'c000011':  c000011_SolRing();                   break; // ok
    case 'c000012':  c000012_BlackLotus();                break; // ok
    case 'c000013':  c000013_Bayou();                     break; // ok
    case 'c000014':  c000014_Badlands();                  break; // ok
    case 'c000015':  c000015_Plateau();                   break; // ok
    case 'c000016':  c000016_Savannah();                  break; // ok
    case 'c000017':  c000017_Scrubland();                 break; // ok
    case 'c000018':  c000018_Taiga();                     break; // ok
    case 'c000019':  c000019_TropicalIsland();            break; // ok
    case 'c000020':  c000020_Tundra();                    break; // ok
    case 'c000021':  c000021_UndergroundSea();            break; // ok
    case 'c000022':  c000022_VolcanicIsland();            break; // ok
    case 'c000023':  c000023_AncestralRecall();           break; // ok
    case 'c000024':  c000024_Armageddon();                break; // ok
    case 'c000025':  c000025_BadMoon();                   break; // ok
    case 'c000026':  c000026_BlackKnight();               break; // ok
    case 'c000027':  c000027_DarkRitual();                break; // ok
    case 'c000028':  c000028_DrudgeSkeletons();           break; // ok
    case 'c000029':  c000029_Fork();                      break;
    case 'c000030':  c000030_HowlingMine();               break;
    case 'c000031':  c000031_HypnoticSpecter();           break;
    case 'c000032':  c000032_LightningBolt();             break; // ok
    case 'c000033':  c000033_ShivanDragon();              break; // ok
    case 'c000034':  c000034_TimeWalk();                  break; // ok
    case 'c000035':  c000035_KirdApe();                   break;
    case 'c000036':  c000036_GrayOrge();                  break; // ok
    case 'c000037':  c000037_BrassMan();                  break;
    case 'c000038':  c000038_Counterspell();              break; // ok
    case 'c000039':  c000039_CrawWurm();                  break; // ok
    case 'c000040':  c000040_EarthElemental();            break; // ok
    case 'c000041':  c000041_ElvishArchers();             break; // ok
    case 'c000042':  c000042_FireElemental();             break; // ok
    case 'c000043':  c000043_GiantGrowth();               break; // ok
    case 'c000044':  c000044_GiantSpider();               break; // ok
    case 'c000045':  c000045_GoblinBalloonBrigade();      break;
    case 'c000046':  c000046_GraniteGargoyle();           break; // ok
    case 'c000047':  c000047_GrizzlyBears();              break; // ok
    case 'c000048':  c000048_HillGiant();                 break; // ok
    case 'c000049':  c000049_HurloonMinotaur();           break; // ok
    case 'c000050':  c000050_IronrootTreefolk();          break; // ok
    case 'c000051':  c000051_LlanowarElves();             break;
    case 'c000052':  c000052_MonssGoblinRaiders();        break; // ok
    case 'c000053':  c000053_Ornithopter();               break; // ok
    case 'c000054':  c000054_SavannahLions();             break; // ok
    case 'c000055':  c000055_UnholyStrength();            break; // ok
    case 'c000056':  c000056_WallofIce();                 break; // ok
    case 'c000057':  c000057_Disenchant();                break; // ok
    case 'c000058':  c000058_Shatter();                   break;
    case 'c000059':  c000059_Shatterstorm();              break;
    case 'c000060':  c000060_Disintegrate();              break;
    case 'c000061':  c000061_DemonicTutor();              break;
    case 'c000062':  c000062_EyeForAnEye();               break;
    case 'c000063':  c000063_IvoryTower();                break;
    case 'c000064':  c000064_ManaFlare();                 break;
    case 'c000065':  c000065_Terror();                    break;
    case 'c000066':  c000066_WarpArtifact();              break;
    case 'c000067':  c000067_Weakness();                  break;
    case 'c000068':  c000068_WheelOfFortune();            break;
    case 'c000069':  c000069_WrathOfGod();                break;
    case 'c000070':  c000070_HowlFromBeyond();            break;
    case 'c000071':  c000071_AirElemental();              break; // ok
    case 'c000072':  c000072_MahamotiDjinn();             break; // ok
    case 'c000073':  c000073_MerfolkOfThePearlTrident();  break; // ok
    case 'c000074':  c000074_PhantasmalForces();          break;
    case 'c000075':  c000075_PhantomMonster();            break; // ok
    case 'c000076':  c000076_SerraAngel();                break; // ok
    case 'c000077':  c000077_SwordsToPlowshares();        break;
    case 'c000078':  c000078_WallOfAir();                 break; // ok
    case 'c000079':  c000079_Unsummon();                  break;
    case 'c000080':  c000080_ErgRaiders();                break;
    case 'c000081':  c000081_WillOTheWisp();              break; // ok
    case 'c000082':  c000082_WhiteKnight();               break; // ok
    case 'c000083':  c000083_WallOfSwords();              break; // ok
    case 'c000084':  c000084_Righteousness();             break;
    case 'c000085':  c000085_NorthernPaladin();           break;
    case 'c000086':  c000086_SerendibEfreet();            break;
    case 'c000087':  c000087_RocOfKherRidges();           break; // ok
    case 'c000088':  c000088_RoyalAssassin();             break;
    case 'c000089':  c000089_JuzamDjinn();                break;
    case 'c000090':  c000090_SengirVampire();             break;
    case 'c000091':  c000091_BirdsOfParadise();           break;
    case 'c000092':  c000092_BlackVise();                 break;
    case 'c000093':  c000093_Braingeyser();               break;
    case 'c000094':  c000094_Clone();                     break;
    case 'c000095':  c000095_ControlMagic();              break;
    case 'c000096':  c000096_CopyArtifact();              break;
    case 'c000097':  c000097_Fastbond();                  break;
    case 'c000098':  c000098_Fireball();                  break;
    case 'c000099':  c000099_Juggernaut();                break;
    case 'c000100':  c000100_MindTwist();                 break;
    case 'c000101':  c000101_Millstone();                 break;
    case 'c000102':  c000102_NevinyrralsDisk();           break;
    case 'c000103':  c000103_Regrowth();                  break;
    case 'c000104':  c000104_SorceressQueen();            break;
    case 'c000105':  c000105_TheRack();                   break;
    case 'c000106':  c000106_VesuvanDoppelganger();       break;
    case 'c000107':  c000107_AnimateDead();               break;
    case 'c000108':  c000108_Earthquake();                break;
    case 'c000109':  c000109_GauntletOfMight();           break;
    case 'c000110':  c000110_IcyManipulator();            break;
    case 'c000111':  c000111_Sinkhole();                  break;
    case 'c000112':  c000112_Timetwister();               break;
    case 'c000113':  c000113_TheAbyss();                  break;
    case 'c000114':  c000114_LibraryOfAlexandria();       break;
    case 'c000115':  c000115_Jokulhaups();                break;
    case 'c000116':  c000116_Inferno();                   break;
    case 'c000117':  c000117_BalduvianHorde();            break;
    case 'c000118':  c000118_Incinerate();                break;
    case 'c000119':  c000119_Crusade();                   break;
    case 'c000120':  c000120_CarrionAnts();               break; // ok
    case 'c000121':  c000121_MishrasFactory();            break;
    case 'c000122':  c000122_RaiseDead();                 break;
    case 'c000123':  c000123_DrainLife();                 break;
    case 'c000124':  c000124_UnderworldDreams();          break;
    case 'c000125':  c000125_DeadlyInsect();              break;
    case 'c000126':  c000126_ErhnamDjinn();               break;
    case 'c000127':  c000127_ConcordantCrossroads();      break;
    case 'c000128':  c000128_BallLightning();             break;
    case 'c000129':  c000129_GiantTortoise();             break;
    case 'c000130':  c000130_TimeElemental();             break;
    case 'c000131':  c000131_GhostShip();                 break; // ok
    case 'c000132':  c000132_PsychicVenom();              break;
    case 'c000133':  c000133_FeldonsCane();               break;
    case 'c000134':  c000134_ColossusOfSardia();          break;
    case 'c000135':  c000135_KillerBees();                break; // ok
    default: console.warn('Card ID not found', card.id); 
  }

  function isAlsoType(extraTypes: string[] | string) {
    if (typeof extraTypes === 'string') { extraTypes = [extraTypes]; }
    card.isType = (type) => (extraTypes.indexOf(type) >= 0 || type === card.type);
  }

  // Common Lands
  function c000001_Island()   { commonLand(1); isAlsoType('island');   } // 1 Blue Mana
  function c000002_Plains()   { commonLand(2); isAlsoType('plains');   } // 1 White Mana
  function c000003_Swamp()    { commonLand(3); isAlsoType('swamp');    } // 1 Black Mana
  function c000004_Mountain() { commonLand(4); isAlsoType('mountain'); } // 1 Red Mana
  function c000005_Forest()   { commonLand(5); isAlsoType('forest');   } // 1 Green Mana


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

  function c000057_Disenchant() {
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
    card.onAbility = (nextState: TGameState) => {
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
    card.onAbility = (nextState: TGameState) => {
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
    card.onAbility = (nextState: TGameState) => {
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
    card.onAbility = (nextState: TGameState) => {
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
        neededTargets: 3, possibleTargets, customDialog: 'BlackLotus', // Targets will be the colors (1,2,3,4,5)
        text: `Tap to add 3 mana of any single color`
      }
    };
    card.onAbility = (nextState: TGameState) => { // Adds 3 color mana (targets = selected colors)
      const { cardPlayer } = getShorts(nextState);
      card.targets.forEach(target => {
        const mana = Number.parseInt(target.split('custom-color-')[1]);
        cardPlayer.manaPool[mana] += 1;
      });
      card.customDialog = null;
      moveCardToGraveyard(nextState, gId);
    };
  }


  
  function dualLand(color1: number, color2: number) {
    const landTypes = ['', 'island', 'plains', 'swamp', 'mountain', 'forest'];
    isAlsoType([landTypes[color1], landTypes[color2]]);
    
    card.getAbilityCost = () => {
      const possibleTargets = ['custom-color-' + color1, 'custom-color-' + color2];
      return {
        mana: [0,0,0,0,0,0], tap: true,
        neededTargets: 1, possibleTargets, customDialog: card.name.replaceAll(' ', ''), // Target will be the color
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
    card.onAbility = (nextState: TGameState) => {
      const { card, cardPlayer } = getShorts(nextState);
      if (!card.isTapped && card.location.slice(0,4) === 'tble') {
        const mana = Number.parseInt(card.targets[0].split('custom-color-')[1]);
        cardPlayer.manaPool[mana] += 1;
        card.isTapped = true;
        card.customDialog = null;
      } 
    };
  }
  // 0=uncolored, 1=blue, 2=white, 3=black, 4=red, 5=green
  function c000013_Bayou()          { dualLand(3, 5); }
  function c000014_Badlands()       { dualLand(3, 4); }
  function c000015_Plateau()        { dualLand(2, 4); }
  function c000016_Savannah()       { dualLand(2, 5); }
  function c000017_Scrubland()      { dualLand(2, 3); }
  function c000018_Taiga()          { dualLand(4, 5); }
  function c000019_TropicalIsland() { dualLand(1, 5); }
  function c000020_Tundra()         { dualLand(1, 2); }
  function c000021_UndergroundSea() { dualLand(1, 3); }
  function c000022_VolcanicIsland() { dualLand(1, 4); }


  function c000024_Armageddon() {
    card.onSummon = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      tableStack.filter(c => c.type === 'land').forEach(land => {
        console.log(`Land ${land.gId} ${land.name} is destroyed`);
        moveCardToGraveyard(nextState, land.gId);
      });
    };    
  }

  function c000069_WrathOfGod() {
    card.onSummon = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      tableStack.filter(c => c.type === 'creature').forEach(creature => {
        console.log(`Creature ${creature.gId} ${creature.name} is destroyed`);
        killCreature(nextState, creature.gId);
      });
    };
  }




  function c000028_DrudgeSkeletons() {
    commonCreature();
    addRegenerateAbility();
    card.getAbilityCost = () => ({ mana: [0,0,0,1,0,0], tap: false, text: `Pay 1 black mana to regenerate ${card.name}` });    
  }

  function c000081_WillOTheWisp() { 
    commonCreature();
    addRegenerateAbility();
    card.getAbilityCost = () => ({ mana: [0,0,0,1,0,0], tap: false, text: `Pay 1 black mana to regenerate ${card.name}` });
  }

  function c000131_GhostShip() {
    commonCreature();
    addRegenerateAbility();
    card.getAbilityCost = () => ({ mana: [0,3,0,0,0,0], tap: false, text: `Pay 3 blue mana to regenerate ${card.name}` });
  }


  function c000120_CarrionAnts() {
    commonCreature();
    card.getAbilityCost = () => ({ mana: [1,0,0,0,0,0], tap: false, text: `Pay 1 mana to add +1/+1`, });
    card.onAbility = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'turn', gId, targets: [], id: randomId('e') });
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+1 to target creature
      const { card } = getShorts(nextState);
      card.turnAttack += 1;
      card.turnDefense += 1;
    }    
  }

  function c000135_KillerBees() {
    commonCreature();
    card.getAbilityCost = () => ({ mana: [0,0,0,0,0,1], tap: false, text: `Pay 1 green mana to add +1/+1`, });
    card.onAbility = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'turn', gId, targets: [], id: randomId('e') });
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+1 to target creature
      const { card } = getShorts(nextState);
      card.turnAttack += 1;
      card.turnDefense += 1;
    }    
  }

  function c000076_SerraAngel() {
    commonCreature();
    card.afterCombat = (nextState: TGameState) => {
      card.isTapped = false;
    }
  }

  function c000035_KirdApe() {
    commonCreature();
    card.onSummon = (nextState: TGameState) => {
      const { card } = getShorts(nextState);
      moveCard(nextState, card.gId, 'tble');
      card.status = 'sickness';
      card.combatStatus = null;
      nextState.effects.push({ scope: 'permanent', gId, targets: [], id: randomId('e') });
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+1 to target creature
      const { card, otherPlayer } = getShorts(nextState);
      const lands = nextState.cards.filter(c => c.controller === otherPlayer.num && c.location.slice(0,4) === 'tble' && c.type === 'land');
      let hasForest = false;
      lands.forEach(land => {
        if (extendCardLogic(land).isType('forest')) {
          hasForest = true;
        }
      });
      if (hasForest) {
        card.turnAttack += 1;
        card.turnDefense += 2;
        console.log('HAS FORESTS');
      } else {
        console.log('NO FORESTS');
      }
    }
  }

  function c000111_Sinkhole() {
    card.getSummonCost = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => extendCardLogic(c).isType('land')).map(c => c.gId);
      return { mana: card.cast, neededTargets: 1, possibleTargets }; // targets = all lands in play
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      moveCardToGraveyard(nextState, targetId); // Destroy land
    };
  }



  // Kird Ape
  // Llanowar Elves
  // Shatter
  // Shatterstorm
  // Terror
  // Weakness
  // Wheel of Fortune
  // Swords To Plowshares
  // Unsummon
  // Erg Raiders
  // Roay Assassin


  // - Require dialog:
  // Hypnotic Specter
  // Demonic Tutor
  function c000091_BirdsOfParadise() { 
    commonCreature();
    card.getAbilityCost = () => ({ mana: [0,0,0,0,0,0], tap: true, text: `Tap to add 1 mana`, });
    card.onAbility = (nextState: TGameState) => { };
  }




  // Common Creatures
  function c000052_MonssGoblinRaiders()       { commonCreature(); }
  function c000053_Ornithopter()              { commonCreature(); }
  function c000054_SavannahLions()            { commonCreature(); }
  function c000039_CrawWurm()                 { commonCreature(); }
  function c000040_EarthElemental()           { commonCreature(); }
  function c000041_ElvishArchers()            { commonCreature(); }
  function c000042_FireElemental()            { commonCreature(); }
  function c000026_BlackKnight()              { commonCreature(); }
  function c000036_GrayOrge()                 { commonCreature(); }
  function c000037_BrassMan()                 { commonCreature(); }
  function c000045_GoblinBalloonBrigade()     { commonCreature(); }
  function c000047_GrizzlyBears()             { commonCreature(); }
  function c000048_HillGiant()                { commonCreature(); }
  function c000049_HurloonMinotaur()          { commonCreature(); }
  function c000050_IronrootTreefolk()         { commonCreature(); }
  function c000051_LlanowarElves()            { commonCreature(); }
  function c000056_WallofIce()                { commonCreature(); }
  function c000071_AirElemental()             { commonCreature(); }
  function c000072_MahamotiDjinn()            { commonCreature(); }
  function c000073_MerfolkOfThePearlTrident() { commonCreature(); }
  function c000075_PhantomMonster()           { commonCreature(); }
  function c000078_WallOfAir()                { commonCreature(); }
  function c000083_WallOfSwords()             { commonCreature(); }
  function c000087_RocOfKherRidges()          { commonCreature(); }
  function c000082_WhiteKnight()              { commonCreature(); }





  // // Pending to be coded......
  function c000029_Fork() {}
  function c000030_HowlingMine() {}
  function c000031_HypnoticSpecter() {}  
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
  function c000070_HowlFromBeyond() {}


  function c000074_PhantasmalForces() { }
  function c000077_SwordsToPlowshares() { }
  function c000079_Unsummon() { }
  function c000080_ErgRaiders() { }
  function c000084_Righteousness() { }
  function c000085_NorthernPaladin() { }
  function c000086_SerendibEfreet() { }
  function c000088_RoyalAssassin() { }
  function c000089_JuzamDjinn() { }
  function c000090_SengirVampire() { }
  function c000092_BlackVise() { }
  function c000093_Braingeyser() { }
  function c000094_Clone() { }
  function c000095_ControlMagic() { }
  function c000096_CopyArtifact() { }
  function c000097_Fastbond() { }
  function c000098_Fireball() { }
  function c000099_Juggernaut() { }
  function c000100_MindTwist() { }
  function c000101_Millstone() { }
  function c000102_NevinyrralsDisk() { }
  function c000103_Regrowth() { }
  function c000104_SorceressQueen() { }
  function c000105_TheRack() { }
  function c000106_VesuvanDoppelganger() { }
  function c000107_AnimateDead() { }
  function c000108_Earthquake() { }
  function c000109_GauntletOfMight() { }
  function c000110_IcyManipulator() { }
  function c000112_Timetwister() { }
  function c000113_TheAbyss() { }
  function c000114_LibraryOfAlexandria() { }
  function c000115_Jokulhaups() { }
  function c000116_Inferno() { }
  function c000117_BalduvianHorde() { }
  function c000118_Incinerate() { }
  function c000119_Crusade() { }
  function c000121_MishrasFactory() { }
  function c000122_RaiseDead() { }
  function c000123_DrainLife() { }
  function c000124_UnderworldDreams() { }
  function c000125_DeadlyInsect() { }
  function c000126_ErhnamDjinn() { }
  function c000127_ConcordantCrossroads() { }
  function c000128_BallLightning() { }
  function c000129_GiantTortoise() { }
  function c000130_TimeElemental() { }
  function c000132_PsychicVenom() { }
  function c000133_FeldonsCane() { }
  function c000134_ColossusOfSardia() { }

  return card;
}




