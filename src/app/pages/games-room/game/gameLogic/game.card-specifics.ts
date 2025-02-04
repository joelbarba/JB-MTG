import { randomId } from "../../../../core/common/commons";
import { dbCards } from "../../../../core/dbCards";
import { TActionCost, TActionParams, TCardExtraType, TColor, TGameCard, TGameState } from "../../../../core/types";
import { addLifeChange, destroyCard, drawCard, getCards, killCreature, moveCard, moveCardToGraveyard, shuffleDeck } from "./game.utils";


// ------------------------ SPECIFIC EVENTS for every CARD ------------------------

export const extendCardLogic = (card: TGameCard): TGameCard => {
  const gId = card.gId;
  // if (card.hasOwnProperty('onSummon')) { return card; }
  // The card object when extended is a reference of the nextState at the begining of the reducer
  // so it always points to the cards of the same state is passed on the functions.
  // But to be 100% pure, we should filter the object from the given nextState in every function --> const card = getCard(nextState);

  // Functions to exted: common values
  card.onSummon         = (nextState) => { moveCard(nextState, gId, 'tble'); getCard(nextState).status = null; }
  card.onStack          = (nextState) => {}
  card.onAbility        = (nextState) => {}
  card.onDestroy        = (nextState) => {};
  card.onDiscard        = (nextState) => moveCard(nextState, gId, 'grav');
  card.onUpkeep         = (nextState, paid) => {};
  card.onPlayerDamage   = (nextState, damage) => {};
  card.onCreatureDamage = (nextState, damage) => {};
  card.afterCombat      = (nextState) => {};
  card.onEffect         = (nextState, effectId: string) => {};
  card.canUntap         = (nextState) => true;
  card.canAttack        = (nextState) => !!card.isType('creature');
  card.canDefend        = (nextState) => !!card.isType('creature');
  card.targetBlockers   = (nextState) => [];  // Returns a list of gId of the attacking creatues that can block
  card.getSummonCost    = (nextState) => ({ mana: card.cast });
  card.getAbilityCost   = (nextState) => null;
  card.getUpkeepCost    = (nextState) => null;
  card.onTarget         = (state) => {};
  card.onCancel         = (state) => {};
  card.isColor          = (color) => card.color === color;
  card.isType           = (...types) => {
    if (types.indexOf(card.type) >= 0) { return true; }    
    return !!card.allTypes?.find(type => types.indexOf(type) >= 0);
  }

  function isAlsoType(...extraTypes: TCardExtraType[]) {
    if (!card.allTypes) { card.allTypes = [card.type]; }
    extraTypes.forEach(type => {
      if (card.allTypes.indexOf(type) <= 0) { card.allTypes.push(type); }
    });
  }

  card.getCost = (nextState, action) => {
    if (action === 'summon-spell')    { return card.getSummonCost(nextState); }
    if (action === 'trigger-ability') { return card.getAbilityCost(nextState); }
    if (action === 'pay-upkeep')      { return card.getUpkeepCost(nextState); }
    return null;
  }
  

  const getCard = (nextState: TGameState) => nextState.cards.find(c => c.gId === gId) || card;
  const getShorts = (nextState: TGameState) => {
    const card = getCard(nextState);
    const cardPlayer = card.controller === '1' ? nextState.player1 : nextState.player2;
    const otherPlayer = card.controller === '1' ? nextState.player2 : nextState.player1;
    const targetId = card.targets[0]; // code of the first target (playerX, gId, ...)
    const { tableStack, table, stack, deck, hand, play, graveyard } = getCards(nextState, '1'); // Only none A/B groups allowed
    const noProtection = (c: TGameCard) => !c.colorProtection || card.color !== c.colorProtection; 
    const targetCreatures = () => tableStack.filter(c => c.isType('creature') && !c.noTargetSpells).filter(noProtection);
    return { card, targetId, cardPlayer, otherPlayer, noProtection, targetCreatures, table, stack, tableStack, deck, hand, play, graveyard };
  }
  const getPlayer = (nextState: TGameState, targetCard: TGameCard) => {
    return targetCard.controller === '1' ? nextState.player1 : nextState.player2;
  }


  const commonLand = (manaNum: 0|1|2|3|4|5) => {
    card.getAbilityCost = () => ({ 
      mana: [0,0,0,0,0,0], tap: true, effect: 'onTapLand',
      text: `Tap ${card.name} to get 1 mana`,
    });
    card.onSummon = (nextState: TGameState) => {
      const { cardPlayer } = getShorts(nextState);
      cardPlayer.summonedLands += 1;
      moveCard(nextState, gId, 'tble');
    };
    card.onAbility = (nextState: TGameState) => {
      const { card, cardPlayer } = getShorts(nextState);
      cardPlayer.manaPool[manaNum] += 1;
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
    card.targetBlockers = (nextState: TGameState) => { // List of attackers the creature can block
      const { card, table, cardPlayer, otherPlayer } = getShorts(nextState);
      if (!card || card.isTapped) { return []; };
      const defendingCard = card;
      return table.filter(c => c.combatStatus === 'combat:attacking')
        .filter(attackingCard => !attackingCard.colorProtection || attackingCard.colorProtection !== defendingCard.color)
        .filter(attackingCard => !attackingCard.isFlying || defendingCard.isFlying)
        .filter(attackingCard => !attackingCard.notBlockByWalls || !defendingCard.isWall)
        .filter(attackingCard => { // Check land-walk blocking
          return !nextState.cards.find(c => c.controller === cardPlayer.num
            && attackingCard.turnLandWalk
            && c.location.slice(0,4) === 'tble' 
            && c.isType('land')
            && c.isType(attackingCard.turnLandWalk));
        })
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
    case 'c000136':  c000136_Bog_Wraith();                break;
    case 'c000137':  c000137_Shanodin_Dryads();           break;
    case 'c000138':  c000138_Balance();                   break;
    case 'c000139':  c000139_DancingScimitar();           break;
    case 'c000140':  c000140_DesertTwister();             break;
    case 'c000141':  c000141_DingusEgg();                 break;
    case 'c000142':  c000142_DisruptingScepter();         break;
    case 'c000143':  c000143_Flashfires();                break;
    case 'c000144':  c000144_ForceOfNature();             break;
    case 'c000145':  c000145_FrozenShade();               break;
    case 'c000146':  c000146_HealingSalve();              break;
    case 'c000147':  c000147_HolyStrength();              break;
    case 'c000148':  c000148_Hurricane();                 break;
    case 'c000149':  c000149_JayemdaeTome();              break;
    case 'c000150':  c000150_Karma();                     break;
    case 'c000151':  c000151_NetherShadow();              break;
    case 'c000152':  c000152_ObsianusGolem();             break;
    case 'c000153':  c000153_Onulet();                    break;
    case 'c000154':  c000154_PearledUnicorn();            break;
    case 'c000155':  c000155_Reconstruction();            break;
    case 'c000156':  c000156_ReverseDamage();             break;
    case 'c000157':  c000157_ScatheZombies();             break;
    case 'c000158':  c000158_StreamOfLife();              break;
    case 'c000159':  c000159_Tranquility();               break;
    case 'c000160':  c000160_Tsunami();                   break;
    case 'c000161':  c000161_WallOfBone();                break;
    case 'c000162':  c000162_WallOfBrambles();            break;
    case 'c000163':  c000163_WallOfStone();               break;
    case 'c000164':  c000164_WallOfWood();                break;
    case 'c000165':  c000165_WarMammoth();                break;
    case 'c000166':  c000166_WaterElemental();            break;
    case 'c000167':  c000167_WinterOrb();                 break;
    case 'c000168':  c000168_CopperTablet();              break;
    case 'c000169':  c000169_IceStorm();                  break;
    case 'c000170':  c000170_Moat();                      break;
    case 'c000171':  c000171_Cleanse();                   break;
    case 'c000172':  c000172_DivineOffering();            break;
    case 'c000173':  c000173_DivineTransformation();      break;
    case 'c000174':  c000174_Mightstone();                break;
    case 'c000175':  c000175_StripMine();                 break;
    default: console.warn('Card ID not found', card.id); 
  }



  // Common Lands
  function c000001_Island()   { commonLand(1); isAlsoType('island');   } // 1 Blue Mana
  function c000002_Plains()   { commonLand(2); isAlsoType('plains');   } // 1 White Mana
  function c000003_Swamp()    { commonLand(3); isAlsoType('swamp');    } // 1 Black Mana
  function c000004_Mountain() { commonLand(4); isAlsoType('mountain'); } // 1 Red Mana
  function c000005_Forest()   { commonLand(5); isAlsoType('forest');   } // 1 Green Mana


  // Common Creatures
  function c000052_MonssGoblinRaiders()       { commonCreature(); }
  function c000053_Ornithopter()              { commonCreature(); isAlsoType('artifact'); }
  function c000054_SavannahLions()            { commonCreature(); }
  function c000039_CrawWurm()                 { commonCreature(); }
  function c000040_EarthElemental()           { commonCreature(); }
  function c000041_ElvishArchers()            { commonCreature(); }
  function c000042_FireElemental()            { commonCreature(); }
  function c000026_BlackKnight()              { commonCreature(); }
  function c000036_GrayOrge()                 { commonCreature(); }
  function c000045_GoblinBalloonBrigade()     { commonCreature(); }
  function c000047_GrizzlyBears()             { commonCreature(); }
  function c000048_HillGiant()                { commonCreature(); }
  function c000049_HurloonMinotaur()          { commonCreature(); }
  function c000050_IronrootTreefolk()         { commonCreature(); }
  function c000056_WallofIce()                { commonCreature(); }
  function c000071_AirElemental()             { commonCreature(); }
  function c000072_MahamotiDjinn()            { commonCreature(); }
  function c000073_MerfolkOfThePearlTrident() { commonCreature(); }
  function c000075_PhantomMonster()           { commonCreature(); }
  function c000078_WallOfAir()                { commonCreature(); }
  function c000083_WallOfSwords()             { commonCreature(); }
  function c000087_RocOfKherRidges()          { commonCreature(); }
  function c000082_WhiteKnight()              { commonCreature(); }
  function c000136_Bog_Wraith()               { commonCreature(); }
  function c000137_Shanodin_Dryads()          { commonCreature(); }
  function c000125_DeadlyInsect()             { commonCreature(); }
  function c000139_DancingScimitar()          { commonCreature(); }
  function c000152_ObsianusGolem()            { commonCreature(); isAlsoType('artifact'); }
  function c000154_PearledUnicorn()           { commonCreature(); }
  function c000157_ScatheZombies()            { commonCreature(); }
  function c000163_WallOfStone()              { commonCreature(); }
  function c000164_WallOfWood()               { commonCreature(); }
  function c000165_WarMammoth()               { commonCreature(); }
  function c000166_WaterElemental()           { commonCreature(); }



  function c000032_LightningBolt() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = [ ...targetCreatures().map(c => c.gId), 'playerA', 'playerB'];
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetCreatures, targetId } = getShorts(nextState);
      const targetCreature = targetCreatures().find(c => c.gId === targetId);
      if      (targetId === 'player1') { nextState.player1.life -= 3; addLifeChange(nextState, '1', 3, card, 500); } // Deals 3 points of damage to player1
      else if (targetId === 'player2') { nextState.player2.life -= 3; addLifeChange(nextState, '2', 3, card, 500); } // Deals 3 points of damage to player2
      else if (targetCreature) { targetCreature.turnDamage += 3; } // Deals 3 points of damage to target creature
      moveCardToGraveyard(nextState, gId); // Destroy itself
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
      nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: [targetId], id: randomId('e') });
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
      nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [], id: randomId('e') });
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

  // Crusade
  function c000119_Crusade() {
    card.onSummon = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+1 to all white creatures
      const { targetCreatures } = getShorts(nextState);
      const whiteCreatures = targetCreatures().filter(c => c.color === 'white');
      const effect = nextState.effects.find(e => e.id === effectId);
      if (effect) { effect.targets = whiteCreatures.map(c => c.gId); } // Update the effect with all the current black creatures
      whiteCreatures.forEach(creature => {
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
      nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [targetId], id: randomId('e') });
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
      const possibleTargets = tableStack.filter(c => c.isType('enchantment', 'artifact') && noProtection(c)).map(c => c.gId);
      return { mana: card.cast, neededTargets: 1, possibleTargets }; // Target must be any playing enchantment or artifact
    };       
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, targetId, noProtection } = getShorts(nextState);
      const targetCard = tableStack.filter(c => c.isType('enchantment', 'artifact') && noProtection(c)).find(c => c.gId === targetId);
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
    };
  }
  function c000010_MoxSapphire() { moxCommon(1, 'blue');  }
  function c000008_MoxPearl()    { moxCommon(2, 'white'); }
  function c000007_MoxJet()      { moxCommon(3, 'black'); }
  function c000009_MoxRuby()     { moxCommon(4, 'red');   }
  function c000006_MoxEmerald()  { moxCommon(5, 'green'); }

  function c000046_GraniteGargoyle() {
    commonCreature();
    card.getAbilityCost = () => ({ mana: [0,0,0,0,0,0], xMana: [0,0,0,0,1,0], tap: false, text: `Pay 1 red mana to add +0/+1` });
    card.onAbility = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: [], id: randomId('e'), xValue: card.xValue });
      card.xValue = 0;
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +0/+1
      const { card } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      card.turnDefense += effect?.xValue || 0;
    };
  }

  function c000033_ShivanDragon() {
    commonCreature();
    card.getAbilityCost = () => ({ mana: [0,0,0,0,0,0], xMana: [0,0,0,0,1,0], tap: false, text: `Pay 1 red mana to add +1/+0` });
    card.onAbility = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: [], id: randomId('e'), xValue: card.xValue });
      card.xValue = 0;
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+0
      const { card } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      card.turnAttack += effect?.xValue || 0;
    }
  }

  function c000120_CarrionAnts() {
    commonCreature();
    card.getAbilityCost = () => ({ mana: [0,0,0,0,0,0], xMana: [1,1,1,1,1,1], tap: false, text: `Pay 1 mana to add +1/+1`, });
    card.onAbility = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: [], id: randomId('e'), xValue: card.xValue });
      card.xValue = 0;
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+1 to creature
      const { card } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      card.turnAttack += effect?.xValue || 0;
      card.turnDefense += effect?.xValue || 0;
    }    
  }

  function c000135_KillerBees() {
    commonCreature();
    card.getAbilityCost = () => ({ mana: [0,0,0,0,0,0], xMana: [0,0,0,0,0,1], tap: false, text: `Pay 1 green mana to add +1/+1`, });
    card.getAbilityCost = () => ({ mana: [0,0,0,0,0,0], xMana: [0,0,0,0,0, 1], tap: false, text: `Pay 1 green mana to add +1/+1` });
    card.onAbility = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: [], id: randomId('e'), xValue: card.xValue });
      card.xValue = 0;
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +0/+1
      const { card } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      card.turnAttack += effect?.xValue || 0;
      card.turnDefense += effect?.xValue || 0;
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
      drawCard(nextState, playerNum);
      drawCard(nextState, playerNum);
      drawCard(nextState, playerNum);
      moveCardToGraveyard(nextState, gId);
    };
  }

  function c000034_TimeWalk() {
    card.onSummon = (nextState: TGameState) => {
      const { cardPlayer } = getShorts(nextState);
      // const target = 'player' + cardPlayer.num;      
      // nextState.effects.push({ scope: 'turn', trigger: 'onEndTurn', playerNum: cardPlayer.num, gId, targets: [target], id: randomId('e') });
      cardPlayer.extraTurns += 1;
      moveCardToGraveyard(nextState, gId);
    };
    // card.onEffect = (nextState: TGameState, effectId: string) => { // Add +3/+3 to target creature
    //   const { cardPlayer } = getShorts(nextState);
    //   nextState.turn = cardPlayer.num;
    //   nextState.control = cardPlayer.num;
    // }
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
      card.targets = [];
      moveCardToGraveyard(nextState, gId);
    };
  }


  
  function dualLand(color1: number, color2: number) {
    const landTypes = ['island', 'island', 'plains', 'swamp', 'mountain', 'forest'] as TCardExtraType[];
    isAlsoType(landTypes[color1], landTypes[color2]);
    
    card.getAbilityCost = () => {
      const possibleTargets = ['custom-color-' + color1, 'custom-color-' + color2];
      return {
        mana: [0,0,0,0,0,0], tap: true, effect: 'onTapLand',
        neededTargets: 1, possibleTargets, // Target will be the color
        customDialog: card?.name.replaceAll(' ', ''),
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
      const mana = Number.parseInt(card.targets[0].split('custom-color-')[1]);
      cardPlayer.manaPool[mana] += 1;
      card.targets = [];
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
      tableStack.filter(c => c.isType('land')).forEach(land => {
        console.log(`Land ${land.gId} ${land.name} is destroyed`);
        moveCardToGraveyard(nextState, land.gId);
      });
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };    
  }

  function c000069_WrathOfGod() {
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, card } = getShorts(nextState);
      tableStack.filter(c => c.isType('creature')).forEach(creature => {
        console.log(`Creature ${creature.gId} ${creature.name} is destroyed`);
        killCreature(nextState, creature.gId);
      });
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
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
      nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [], id: randomId('e') });
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+1 to target creature
      const { card, cardPlayer } = getShorts(nextState);
      const lands = nextState.cards.filter(c => c.controller === cardPlayer.num && c.location.slice(0,4) === 'tble' && c.isType('land'));
      if (lands.filter(land => land.isType('forest')).length) {
        card.turnAttack += 1;
        card.turnDefense += 2;
      }
    }
  }

  function c000111_Sinkhole() {
    card.getSummonCost = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => c.isType('land')).map(c => c.gId);
      return { mana: card.cast, neededTargets: 1, possibleTargets }; // targets = any lands in play
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      moveCardToGraveyard(nextState, targetId); // Destroy land
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };
  }

  function c000058_Shatter() {
    card.getSummonCost = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => c.isType('artifact')).map(c => c.gId);
      return { mana: card.cast, neededTargets: 1, possibleTargets }; // targets = any artifact
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      moveCardToGraveyard(nextState, targetId); // Destroy artifact
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };
  }

  function c000059_Shatterstorm() {
    card.onSummon = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      tableStack.filter(c => c.isType('artifact')).forEach(artifact => {
        console.log(`Artifact ${artifact.gId} ${artifact.name} is destroyed`);
        moveCardToGraveyard(nextState, artifact.gId); // Destroy artifact
      });
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };
  }

  function c000051_LlanowarElves() {
    commonCreature();
    card.getAbilityCost = () => ({ mana: [0,0,0,0,0,0], tap: true, text: `Tap to add 1 green mana`, });
    card.onAbility = (nextState: TGameState) => { 
      const { card, cardPlayer } = getShorts(nextState);
      cardPlayer.manaPool[5] += 1; // add 1 green mana
    };    
  }

  function c000068_WheelOfFortune() {
    // All players must discard their hands and draw seven new cards
    card.onSummon = (nextState: TGameState) => {
      const { hand } = getShorts(nextState);
      hand.forEach(c => moveCardToGraveyard(nextState, c.gId)); // Discard all hands
      for (let t = 0; t < 7; t++) { // Draw 7 new cards
        drawCard(nextState, '1'); // Player1
        drawCard(nextState, '2'); // Player2
      }
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };
  }

  function c000112_Timetwister() {
    // Set Timetiwister aside in a new graveyard pile.
    // Shuffle your hand, library and graveyard together into a new library and draw
    // a new hand of seven cards, leaving all cards in play where they are.
    // Opponent must do the same.
    card.onSummon = (nextState: TGameState) => {
      const { hand, graveyard } = getShorts(nextState);
      hand.forEach(c => moveCard(nextState, c.gId, 'deck'));      // Move hand --> deck
      graveyard.forEach(c => moveCard(nextState, c.gId, 'deck')); // Move graveyard --> deck
      shuffleDeck(nextState, '1');
      shuffleDeck(nextState, '2');
      for (let t = 0; t < 7; t++) { // Draw 7 new cards
        drawCard(nextState, '1'); // Player1
        drawCard(nextState, '2'); // Player2
      }
      console.log(nextState.cards.filter(c => (c.location === 'hand1' && c.controller === '2') || (c.location === 'hand2' && c.controller === '1')));
      console.log(nextState.cards.filter(c => (c.location === 'deck1' && c.controller === '2') || (c.location === 'deck2' && c.controller === '1')));
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };
  }



  function c000067_Weakness() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = targetCreatures().map(c => c.gId); // Target must be any playing creature
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };        
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [targetId], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add -2/-1 to target creature
      const { targetCreatures } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetCreature = targetCreatures().find(c => c.gId === effectTargetId);
      if (targetCreature) {
        targetCreature.turnAttack -= 2;
        targetCreature.turnDefense -= 1;
      }
    };
  }



  function c000084_Righteousness() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = targetCreatures().filter(c => c.combatStatus === 'combat:defending').map(c => c.gId); 
      // return { mana: card.cast, neededTargets: 1, possibleTargets }; // Target must be a defending creature
      return { mana: [1,0,0,0,0,0], neededTargets: 1, possibleTargets }; // Target must be a defending creature
    };    
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: [targetId], id: randomId('e') });
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +7/+7 to target creature
      const { targetCreatures } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetCreature = targetCreatures().find(c => c.gId === effectTargetId);
      if (targetCreature) { // target must be a defending creature on the table
        targetCreature.turnAttack  += 7;
        targetCreature.turnDefense += 7;
      }
    }
  }




  // Cards that use extra X mana

  function c000060_Disintegrate() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures, card } = getShorts(nextState);
      const possibleTargets = [ ...targetCreatures().map(c => c.gId), 'playerA', 'playerB'];
      return { mana: card.cast, xMana: [1,1,1,1,1,1], neededTargets: 1, possibleTargets };
    };    
    card.onSummon = (nextState: TGameState) => {
      const { targetCreatures, targetId, card } = getShorts(nextState);
      const targetCreature = targetCreatures().find(c => c.gId === targetId);
      if      (targetId === 'player1') { nextState.player1.life -= card.xValue; } // Deals X points of damage to player1
      else if (targetId === 'player2') { nextState.player2.life -= card.xValue; } // Deals X points of damage to player2
      else if (targetCreature) { targetCreature.turnDamage += card.xValue; } // Deals X points of damage to target creature

      const playerNum = targetId === 'player1' ? '1' : targetId === 'player2' ? '2' : null;
      if (playerNum) { addLifeChange(nextState, playerNum, card.xValue, card, 500); }
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };
  }

  function c000070_HowlFromBeyond() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = targetCreatures().map(c => c.gId); // Target must be any playing creature
      return { mana: card.cast, xMana: [1,1,1,1,1,1], neededTargets: 1, possibleTargets };
    };    
    card.onSummon = (nextState: TGameState) => {
      const { card, targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: [targetId], id: randomId('e'), xValue: card.xValue });
      moveCardToGraveyard(nextState, gId); // Destroy itself (instant)
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +X/+0 to target creature
      const { targetCreatures } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetCreature = targetCreatures().find(c => c.gId === effectTargetId);
      if (targetCreature) { targetCreature.turnAttack += effect?.xValue || 0; }
    }
  }

  function c000093_Braingeyser() { 
    card.getSummonCost = (nextState: TGameState) => {
      const { card } = getShorts(nextState);
      return { mana: card.cast, xMana: [1,1,1,1,1,1], neededTargets: 1, possibleTargets: ['playerA', 'playerB'] };
    };    
    card.onSummon = (nextState: TGameState) => {
      const { targetId, card } = getShorts(nextState);
      if (targetId === 'player1' || targetId === 'player2') {
        const playerNum = targetId.split('player')[1] as '1' | '2';
        for (let t = 0; t < card.xValue; t++) { drawCard(nextState, playerNum); }
      }
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    }
  }

  function c000100_MindTwist() {
    card.getSummonCost = (nextState: TGameState) => {
      const { card } = getShorts(nextState);
      return { mana: card.cast, xMana: [1,1,1,1,1,1], neededTargets: 0, possibleTargets: [] }; // Target is always opponent
    };    
    card.onSummon = (nextState: TGameState) => {
      const { card, otherPlayer, hand } = getShorts(nextState);
      const handB = hand.filter(c => c.controller === otherPlayer.num);
      const maxNum = Math.min(handB.length, card.xValue); // Total number of cards to discard

      // Shuffle cards in hand and take the X first
      const cardsToDiscard = handB.map(c => ({ gId: c.gId, r: Math.random() })).sort((a,b) => a.r > b.r ? 1: -1).map(v => v.gId).slice(0, maxNum);
      cardsToDiscard.forEach(gId => {
        moveCardToGraveyard(nextState, gId); // Discard card
      });

      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    }
  }

  function c000108_Earthquake() {
    card.getSummonCost = (nextState: TGameState) => {
      const { card } = getShorts(nextState);
      return { mana: card.cast, xMana: [1,1,1,1,1,1], neededTargets: 0, possibleTargets: [] };
    };    
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, card, cardPlayer, otherPlayer } = getShorts(nextState);      
      tableStack.filter(c => c.isType('creature') && !c.isFlying).forEach(creature => {
        creature.turnDamage += card.xValue; // Deals X points of damage to each non flying creature
      });
      nextState.player1.life -= card.xValue; // Deals X points of damage to player1
      nextState.player2.life -= card.xValue; // Deals X points of damage to player2
      addLifeChange(nextState, otherPlayer.num, card.xValue, card, 0);
      addLifeChange(nextState, cardPlayer.num,  card.xValue, card, 0);
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    }
  }


  function c000077_SwordsToPlowshares() { 
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      return { mana: card.cast, neededTargets: 1, possibleTargets: targetCreatures().map(c => c.gId) };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetCreatures, targetId } = getShorts(nextState);
      const targetCreature = targetCreatures().find(c => c.gId === targetId);
      if (targetCreature) {        
        moveCardToGraveyard(nextState, targetCreature.gId, true); // Destroy creature (remove from the game)
        const player = targetCreature.controller === '1' ? nextState.player1 : nextState.player2;        
        const lifeGain = targetCreature.turnAttack;
        player.life += lifeGain; // Creature's controller gains as many life as the creature's power
        nextState.lifeChanges.push({ player: player.num, title: card.name, 
          damage: -lifeGain, originalDamage: -lifeGain, gId: card.gId, timer: 0,
          text  : `Your ${targetCreature.name} was destroyed. You get ${lifeGain} life.`,
          opText: `Your opponent's ${targetCreature.name} was destroyed. He/she gets ${lifeGain} life.`,
        });
      }
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
  }

  function c000065_Terror() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      return { mana: card.cast, neededTargets: 1, possibleTargets: targetCreatures().filter(creature => {
          if (creature.color === 'black') { return false; } // Cannot target black creatures
          if (creature.isType('artifact')) { return false; } // Cannot target artifact creatures
          return true;
        }).map(c => c.gId) 
      };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetCreatures, targetId } = getShorts(nextState);
      const targetCreature = targetCreatures().find(c => c.gId === targetId);
      if (targetCreature) { moveCardToGraveyard(nextState, targetCreature.gId); } // Destroy creature
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
  }


  // Upkeep cards

  // Bras Man does not untap as normal; you must pay 1 during your upkeep to untap it
  function c000037_BrassMan() {
    commonCreature();
    isAlsoType('artifact');
    card.canUntap = () => false;
    card.getUpkeepCost = (nextState) => {
      const { card } = getShorts(nextState);
      if (!card.isTapped) { return null; }
      return { // Cost to untap Brass Man
        mana: [1,0,0,0,0,0], canSkip: true,
        text: 'Pay 1 uncolored mana to untap Brass Man',
        skipText: `Leave Brass Man untapped`,
        opText: 'Opponent is untapping Brass Man'
      };
    }
    card.onUpkeep = (nextState, skip) => {
      const { card } = getShorts(nextState);
      if (!skip) { card.isTapped = false; } // Untap it
    };
  }

  // During your upkeep phase, gain 1 life for each card in your hand above 4
  function c000063_IvoryTower() {
    card.getUpkeepCost = (nextState) => {
      const { cardPlayer, hand } = getShorts(nextState);
      const numOfHandCards = hand.filter(c => c.controller === cardPlayer.num).length;
      let text = `You gain 1 life for each card in your hand above 4.`;
      text += `<br/><br/>You have ${numOfHandCards} cards, so you gain ${Math.max(0, numOfHandCards - 4)} life.`;
      let opText = `Player opponent gains 1 life for each card in their hand above 4.`;
      opText += `<br/><br/>Player has ${numOfHandCards} cards, so +${Math.max(0, numOfHandCards - 4)} life.`;
      return { mana: [0,0,0,0,0,0], text, opText };
    }
    card.onUpkeep = (nextState, skip) => {
      const { cardPlayer, hand } = getShorts(nextState);
      const numOfHandCards = hand.filter(c => c.controller === cardPlayer.num).length;
      const lifeGain = numOfHandCards - 4;
      if (lifeGain > 0) {
        cardPlayer.life += lifeGain;
        addLifeChange(nextState, cardPlayer.num, -lifeGain, card, 500);
      }
    };
  }

  // Controller must spend (1blue) during upkeep to maintain or Phantasmal Forces are destroyed
  function c000074_PhantasmalForces() {
    commonCreature();
    card.getUpkeepCost = (nextState) => {
      const text = 'You must pay 1 blue mana to maintain Phantasmal Forces, or they are destroyed';
      const opText = 'Player opponent is paying Phantasmal Forces upkeep';
      const skipText = `Don't pay let it be destroyed`;
      return { mana: [0,1,0,0,0,0], text, opText, canSkip: true, skipText };
    }
    card.onUpkeep = (nextState, skip) => {
      const { card } = getShorts(nextState);
      if (skip) { moveCardToGraveyard(nextState, card.gId) } // If upkeep not paid: Destroy it
    };
  }

  function c000086_SerendibEfreet() { 
    commonCreature();
    card.getUpkeepCost = () => {
      const opText = `Serendib Efreet does 1 damage to your opponent`;
      return { mana: [0,0,0,0,0,0], text: `Serendib Efreet does 1 damage to you`, opText };
    };
    card.onUpkeep = (nextState, skip) => {
      const { card, cardPlayer } = getShorts(nextState);
      cardPlayer.life -= 1; // Serendib Efreet does 1 damage to you
      addLifeChange(nextState, cardPlayer.num, 1, card, 200);
    };
  }
  
  function c000089_JuzamDjinn() {
    commonCreature();
    card.getUpkeepCost = () => {
      const opText = `Juzám Djinn does 1 damage to your opponent`;
      return { mana: [0,0,0,0,0,0], text: `Juzám Djinn does 1 damage to you`, opText };
    };
    card.onUpkeep = (nextState, skip) => {
      const { card, cardPlayer } = getShorts(nextState);
      cardPlayer.life -= 1; // Juzám Djinn does 1 damage to you
      addLifeChange(nextState, cardPlayer.num, 1, card, 200);
    };
  }

  // If opponent has > 4 cards in hand during upkeep, does 1 damage for each in excess of 4
  function c000092_BlackVise() {
    card.getUpkeepCost = (nextState) => {
      const { otherPlayer, hand } = getShorts(nextState);
      const numOfHandCards = hand.filter(c => c.controller === otherPlayer.num).length;
      let text = `Your opponent's Black Vise does 1 damage to you for for each card in excess of 4 in your hand.`;
      text += `<br/><br/>You have ${numOfHandCards} cards, so you get ${Math.max(0, numOfHandCards - 4)} damage`;
      let opText = `Your Black Vise does 1 damage to your opponent for for each card in excess of 4 in their hand.`;
      opText += `<br/><br/>Player has ${numOfHandCards} cards, so ${Math.max(0, numOfHandCards - 4)} damage`;
      return { mana: [0,0,0,0,0,0], text, opText };
    }
    card.onUpkeep = (nextState, skip) => {
      const { otherPlayer, hand } = getShorts(nextState);
      const numOfHandCards = hand.filter(c => c.controller === otherPlayer.num).length;
      if (numOfHandCards > 4) {
        const damage = numOfHandCards - 4;
        otherPlayer.life -= damage;
        addLifeChange(nextState, otherPlayer.num, damage, card, 200);
      }
    };
  }
  
  // If opponent has < 3 cards in hand during upkeep, does 1 damage for each card fewer than 3
  function c000105_TheRack() {
    card.getUpkeepCost = (nextState) => {
      const { otherPlayer, hand } = getShorts(nextState);
      const numOfHandCards = hand.filter(c => c.controller === otherPlayer.num).length;
      let text = `Your opponent's The Rack does 1 damage to you for for each card fewer than 3 in their hand`;
      text += `<br/><br/>You have ${numOfHandCards} cards, so you get ${Math.max(0, 3 - numOfHandCards)} damage`;
      let opText = `The Rack does 1 damage to your opponent for for each card fewer than 3 in their hand`;
      opText += `<br/><br/>Player has ${numOfHandCards} cards, so ${Math.max(0, 3 - numOfHandCards)} damage`;
      return { mana: [0,0,0,0,0,0], text, opText };
    }
    card.onUpkeep = (nextState, skip) => {
      const { otherPlayer, hand } = getShorts(nextState);
      const numOfHandCards = hand.filter(c => c.controller === otherPlayer.num).length;
      if (numOfHandCards < 3) {
        const damage = 3 - numOfHandCards;
        otherPlayer.life -= damage;
        addLifeChange(nextState, otherPlayer.num, damage, card, 200);
      }
    };
  }


  

  // During your upkeep, target non-wall creature an opponent control gains forestwalk until your next turn
  function c000126_ErhnamDjinn() {
    commonCreature();
    card.getUpkeepCost = (nextState) => {
      const { table, otherPlayer } = getShorts(nextState);
      const possibleTargets = table.filter(c => c.controller === otherPlayer.num && c.isType('creature') && !c.isWall).map(c => c.gId);
      return {
        mana: [0,0,0,0,0,0],
        text: 'Target non-wall creature an opponent control gains forestwalk until your next turn',
        opText: 'Target non-wall creature you control gains forestwalk until opponent next turn',
        customDialog: 'ErhnamDjinn',
        neededTargets: 1, possibleTargets
      };
    }
    card.onUpkeep = (nextState, skip) => {
      const { card, otherPlayer } = getShorts(nextState);
      nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: card.targets, playerNum: otherPlayer.num, id: randomId('e') });
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add forestwalk to target creature
      const { targetCreatures } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The creature that Erhnam's effect is targetting
      const targetCreature = targetCreatures().find(c => c.gId === effectTargetId);
      if (targetCreature) { targetCreature.turnLandWalk = 'forest'; }
    };
  }



  // One damage to your opponent for each card he/she draws
  function c000124_UnderworldDreams() { 
    card.onSummon = (nextState) => {
      const { card, otherPlayer } = getShorts(nextState);
      moveCard(nextState, gId, 'tble');
      nextState.effects.push({ scope: 'permanent', trigger: 'onDraw', gId, targets: [], playerNum: otherPlayer.num,  id: randomId('e') });
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Does 1 damage for each drawn card
      const { card, otherPlayer } = getShorts(nextState);
      otherPlayer.life -= 1;

      if (!nextState.lifeChanges.length) {
        nextState.lifeChanges.push({ player: otherPlayer.num, title: card.name, 
          damage: 1, originalDamage: 1, gId: card.gId, timer: 0,
          text  : `You draw 1 card. Underworld Dreams does 1 damage to you.`,
          opText: `Your opponent draw 1 card. Underworld Dreams does 1 damage to him/her.`,
        });

      } else { // If drawing multiple cards in the same action
        const lifeChange = nextState.lifeChanges[0];
        if (lifeChange.player === otherPlayer.num && lifeChange.gId === card.gId) {
          const damage = lifeChange.damage + 1;
          lifeChange.damage = damage;
          lifeChange.text   = `You draw ${damage} cards. Underworld Dreams does ${damage} damage to you.`;
          lifeChange.opText = `Your opponent draw ${damage} cards. Underworld Dreams does ${damage} damage to him/her.`;
        }
      }      
    };
  }

  function c000080_ErgRaiders() { 
    commonCreature();
    card.onSummon = (nextState: TGameState) => {
      const { card, cardPlayer } = getShorts(nextState);
      nextState.effects.push({ scope: 'permanent', trigger: 'onEndTurn',         playerNum: cardPlayer.num, gId, targets: [], id: randomId('e') });
      nextState.effects.push({ scope: 'permanent', trigger: 'onEndSelectAttack', playerNum: cardPlayer.num, gId, targets: [], id: randomId('e') });
      moveCard(nextState, card.gId, 'tble');
      card.status = 'sickness';
      card.combatStatus = null;
    };
    card.onEffect = (nextState: TGameState, effectId: string) => {
      const { card, cardPlayer } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      if (effect?.trigger === 'onEndSelectAttack') {
        if (card.combatStatus === 'combat:attacking') { card.tokens = ['attackOk']; } // Remember it attacked

      } else if (effect?.trigger === 'onEndTurn') {
        if (card.status !== 'sickness' && !card.tokens.length) {
          cardPlayer.life -= 2;
          addLifeChange(nextState, cardPlayer.num, 2, card, 0);
        }
        card.tokens = []; // Refresh for next turn
      }
    }
  }


  function c000099_Juggernaut() { 
    commonCreature();
    isAlsoType('artifact');
    card.onSummon = (nextState: TGameState) => {
      const { card, cardPlayer } = getShorts(nextState);
      nextState.effects.push({ scope: 'permanent', trigger: 'duringSelAttack', playerNum: cardPlayer.num, gId, targets: [], id: randomId('e') });
      moveCard(nextState, card.gId, 'tble');
      card.status = 'sickness';
      card.combatStatus = null;
    };
    card.onEffect = (nextState: TGameState, effectId: string) => {
      const { card } = getShorts(nextState);
      if (card.canAttack(nextState)) { // Force Juggernaut to attack (must attack if possible)
        card.combatStatus = 'combat:attacking';
        card.isTapped = true;
      }
    }
  }

  
  function c000079_Unsummon() { // Return target creature to owner's hand
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      return { mana: card.cast, neededTargets: 1, possibleTargets: targetCreatures().map(c => c.gId) };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetCreatures, targetId, tableStack } = getShorts(nextState);
      const targetCreature = targetCreatures().find(c => c.gId === targetId);
      if (targetCreature) {
        tableStack.filter(c => c.isType('enchantment') && c.targets.length === 1 && c.targets[0] === targetCreature.gId).forEach(enchantment => {
          moveCardToGraveyard(nextState, enchantment.gId); // Destroy all enchantments on target
        });
        moveCard(nextState, targetCreature.gId, 'hand'); // Return it to owner's hand
      }
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
  }


  function c000091_BirdsOfParadise() { 
    commonCreature();    
    card.getAbilityCost = () => {
      const possibleTargets = [1, 2, 3, 4, 5].map(v => 'custom-color-' + v);
      return {
        mana: [0,0,0,0,0,0], tap: true,
        neededTargets: 1, possibleTargets, customDialog: 'BirdsOfParadise', // Targets will be the colors (1,2,3,4,5)
        text: `Tap to add 1 mana of any single color`
      }
    };
    card.onAbility = (nextState: TGameState) => { // Adds 1 color mana (targets = selected colors)
      const { card, cardPlayer, targetId } = getShorts(nextState);
      const mana = Number.parseInt(targetId.split('custom-color-')[1]);
      cardPlayer.manaPool[mana] += 1;
      card.targets = [];
    };
  }


  // Inferno
  function c000116_Inferno() {
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, card, cardPlayer, otherPlayer } = getShorts(nextState);      
      tableStack.filter(c => c.isType('creature')).forEach(creature => creature.turnDamage += 6); // Deals 6 points of damage to all creatures
      nextState.player1.life -= 6; // Deals 6 points of damage to player1
      nextState.player2.life -= 6; // Deals 6 points of damage to player2
      addLifeChange(nextState, otherPlayer.num, 6, card, 0);
      addLifeChange(nextState, cardPlayer.num,  6, card, 0);
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    }
  }

  // Warp Artifact
  function c000066_WarpArtifact() {
    card.getSummonCost = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => c.isType('artifact')).map(c => c.gId); // Target = any artifact
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetId, tableStack } = getShorts(nextState);
      const targetArtifact = tableStack.find(c => c.gId === targetId);
      if (targetArtifact) {
        nextState.effects.push({ scope: 'permanent', trigger: 'onEndUpkeep', gId, targets: [targetId], id: randomId('e'), playerNum: targetArtifact.controller });
      }
      moveCard(nextState, gId, 'tble');
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Does 1 damage to target's controller
      const { tableStack } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetArtifact = tableStack.find(c => c.gId === effectTargetId);
      const player = targetArtifact?.controller === '1' ? nextState.player1 : nextState.player2;
      if (targetArtifact) {
        player.life -= 1;
        const text = `Wrap Artifact does 1 damage to you (${targetArtifact.name}'s controller).`;
        const opText = `Wrap Artifact does 1 damage to your opponent (${targetArtifact.name}'s controller).`;
        addLifeChange(nextState, player.num, 1, card, 0, text, opText);
      }
    };
  }


  function c000061_DemonicTutor() {
    card.hideTargetsOnStack = true; // Hides selected card to opponent
    card.getSummonCost = (nextState: TGameState) => {
      const { card, cardPlayer, deck } = getShorts(nextState);
      const possibleTargets = deck.filter(c => c.controller === cardPlayer.num).map(c => c.gId); // One card from your deck
      return { mana: card.cast, customDialog: 'DemonicTutor', neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { card, targetId, cardPlayer } = getShorts(nextState);
      moveCard(nextState, targetId, 'hand'); // Move selected card to your hand
      shuffleDeck(nextState, cardPlayer.num);
      card.targets = [];
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
  }

  function c000103_Regrowth() {
    card.hideTargetsOnStack = true; // Hides selected card to opponent
    card.getSummonCost = (nextState: TGameState) => {
      const { card, cardPlayer, graveyard } = getShorts(nextState);
      const possibleTargets = graveyard.filter(c => c.controller === cardPlayer.num).map(c => c.gId); // Any card from your grav
      return { mana: card.cast, customDialog: 'Regrowth', neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { card, targetId } = getShorts(nextState);
      moveCard(nextState, targetId, 'hand'); // Move selected card to your hand
      card.targets = [];
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
  }

  function c000122_RaiseDead() {
    card.hideTargetsOnStack = true; // Hides selected card to opponent
    card.getSummonCost = (nextState: TGameState) => {
      const { card, cardPlayer, graveyard } = getShorts(nextState);
      const possibleTargets = graveyard.filter(c => c.controller === cardPlayer.num && c.isType('creature')).map(c => c.gId); // Creatures from your grav
      return { mana: card.cast, customDialog: 'RaiseDead', neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { card, targetId } = getShorts(nextState);
      moveCard(nextState, targetId, 'hand'); // Move selected card to your hand
      card.targets = [];
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
  }

  function c000107_AnimateDead() {
    card.getSummonCost = (nextState: TGameState) => {
      const { card, graveyard } = getShorts(nextState);
      const possibleTargets = graveyard.filter(c => c.isType('creature')).map(c => c.gId); // Creatures from any grav
      return { mana: card.cast, customDialog: 'AnimateDead', neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { card, targetId } = getShorts(nextState);
      const targetCreature = nextState.cards.find(c => c.gId === targetId);
      if (targetCreature) {
        targetCreature.controller = card.controller; // Take control of the creature
        moveCard(nextState, targetId, 'hand' + card.controller); // Move selected card to your hand
        targetCreature.onSummon(nextState); // Immediately summon it like if you play it
        targetCreature.status = null; // it has no 'sickness'
        nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [targetId], id: randomId('e'), playerNum: card.controller });
      }
      moveCard(nextState, gId, 'tble');
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Adds -1/-0 to target creature
      const { tableStack } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetCreature = tableStack.find(c => c.gId === effectTargetId);
      if (targetCreature) { targetCreature.turnAttack -= 1; }
    };
    card.onDestroy = (nextState: TGameState) => {
      const targetCreature = nextState.cards.find(c => c.gId === card.targets[0]);
      if (targetCreature) {
        targetCreature.controller = targetCreature.owner; // Return the creature to its owner
        moveCard(nextState, targetCreature.gId, 'tble' + targetCreature.owner);
        moveCardToGraveyard(nextState, targetCreature.gId); // Return creature to its graveyard
      }
    };
  }



  function c000115_Jokulhaups() { // Bury all artifacts, creatures and lands
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, card } = getShorts(nextState);
      tableStack.filter(c => c.isType('creature')).forEach(creature => killCreature(nextState, creature.gId));
      tableStack.filter(c => c.isType('artifact') || c.isType('land')).forEach(card => moveCardToGraveyard(nextState, card.gId));
      moveCardToGraveyard(nextState, card.gId);
    };
  }

  function c000102_NevinyrralsDisk() { 
    card.onSummon = (nextState: TGameState) => {
      const { card } = getShorts(nextState);
      card.status = null; card.isTapped = true; // Disk begins tapped
      moveCard(nextState, gId, 'tble'); 
    }
    card.getAbilityCost = () => ({ mana: [1,0,0,0,0,0], tap: true, text: `Tap ${card.name} to destroy all creatures, enchantments and artifacts` });
    card.onAbility = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      tableStack.filter(c => c.isType('creature')).forEach(creature => killCreature(nextState, creature.gId));
      tableStack.filter(c => c.isType('artifact') || c.isType('enchantment')).forEach(card => moveCardToGraveyard(nextState, card.gId));
      moveCardToGraveyard(nextState, gId);
    };
  }

  function c000128_BallLightning() {
    commonCreature();
    card.onSummon = (nextState) => {
      const { card, cardPlayer } = getShorts(nextState);
      card.status = null;
      card.combatStatus = null;
      nextState.effects.push({ scope: 'permanent', trigger: 'onEndTurn', gId, targets: [], id: randomId('e'), playerNum: cardPlayer.num });
      moveCard(nextState, card.gId, 'tble');
    };
    card.onEffect = (nextState, effectId: string) => {
      killCreature(nextState, gId); // Is buried at the end of the turn
    };
  }


  function c000101_Millstone() { // Take 2 cards from top of target players library and put them into player's graveyard
    card.getAbilityCost = () => {
      const text = `Use ${card.name} to take 2 cards from player's deck to its graveyard`;
      const possibleTargets = ['player1', 'player2'];
      return { mana: [2,0,0,0,0,0], tap: true, neededTargets: 1, possibleTargets, text };
    };
    card.onAbility = (nextState) => {
      const { deck, targetId } = getShorts(nextState);
      const playerNum = targetId.split('player')[1];
      const playerDeck = deck.filter(c => c.controller === playerNum).sort((a, b) => a.order > b.order ? 1 : -1);
      if (playerDeck.length >= 1) { moveCardToGraveyard(nextState, playerDeck[0].gId); }
      if (playerDeck.length >= 2) { moveCardToGraveyard(nextState, playerDeck[1].gId); }
    };
  }

  function c000110_IcyManipulator() {
    card.getAbilityCost = (nextState) => {
      const { tableStack } = getShorts(nextState);
      const text = `Use ${card.name} to tap target artifact, creature or land`;
      const possibleTargets = tableStack.filter(c => !c.isTapped && (c.isType('artifact') || c.isType('creature') || c.isType('land'))).map(c => c.gId);
      return { mana: [1,0,0,0,0,0], tap: true, neededTargets: 1, possibleTargets, text };
    };
    card.onAbility = (nextState) => {
      const { targetId } = getShorts(nextState);
      const target = nextState.cards.find(c => c.gId === targetId);
      if (target) { target.isTapped = true; }
    };
  }

  function c000114_LibraryOfAlexandria() {
    commonLand(0);
    card.getAbilityCost = () => {
      const possibleTargets = ['mana', 'draw'];
      return { mana: [0,0,0,0,0,0], tap: true, customDialog: 'LibraryOfAlexandria', 
               neededTargets: 1, possibleTargets, text: `Use ${card.name}`, effect: 'onTapLand' };
    };
    card.onAbility = (nextState: TGameState) => {
      const { card, targetId, cardPlayer } = getShorts(nextState);
      if (targetId === 'mana') { cardPlayer.manaPool[0] += 1; }
      if (targetId === 'draw') { drawCard(nextState, cardPlayer.num); }
      card.targets = [];
    };   
  }

  function c000133_FeldonsCane() {
    card.getAbilityCost = () => ({ mana: [1,0,0,0,0,0], text: `Use ${card.name} to reshuffle your graveyard into your deck` });
    card.onAbility = (nextState) => {
      const { cardPlayer, graveyard } = getShorts(nextState);
      graveyard.filter(c => c.controller === cardPlayer.num).forEach(c => moveCard(nextState, c.gId, 'deck')); // Move grav to deck
      shuffleDeck(nextState, cardPlayer.num);
      moveCardToGraveyard(nextState, gId, true); // Feldons Cane is removed from the game
    };
  }

  function c000134_ColossusOfSardia() {
    commonCreature();    
    isAlsoType('artifact');
    card.canUntap = () => false;
    card.getUpkeepCost = (nextState) => {
      const { card } = getShorts(nextState);
      if (!card.isTapped) { return null; }
      return { // Cost to untap Colossus of Sardia
        mana: [9,0,0,0,0,0], canSkip: true,
        text: `Pay 9 uncolored mana to untap ${card.name}`,
        skipText: `Leave ${card.name} untapped`,
        opText: `Opponent is untapping ${card.name}`
      };
    }
    card.onUpkeep = (nextState, skip) => {
      if (!skip) { getShorts(nextState).card.isTapped = false; } // Untap it
    };
  }

  function c000031_HypnoticSpecter() {
    commonCreature();
    card.onPlayerDamage = (nextState, damage) => { // discard a card at random from hand
      const { otherPlayer, hand } = getShorts(nextState);      
      const handB = hand.filter(c => c.controller === otherPlayer.num);
      if (handB.length) {
        const randInd = Math.floor(Math.random() * handB.length);
        const cardToDiscard = handB[randInd];
        moveCardToGraveyard(nextState, cardToDiscard.gId);
      }
    };
  }


  function c000090_SengirVampire() {
    commonCreature();
    card.onCreatureDamage = (nextState, damagedCreaturegId, damage) => {
      nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: [damagedCreaturegId], id: 'watch-' + randomId('e') });
    };
    card.onEffect = (nextState, effectId) => {
      const { card } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);

      if (effectId.slice(0,5) === 'watch') { // Watching effect (waiting for the creature to die)
        const damagedCreatureId = effect?.targets[0];
        if (damagedCreatureId && card.tokens.indexOf(damagedCreatureId) < 0) { // If not counted yet (no token with its gId)
          const damagedCreature = nextState.cards.find(c => c.gId === damagedCreatureId);
          if (damagedCreature && damagedCreature.location.slice(0,4) === 'grav') { // If creature died during the current turn
            console.log('A creature has died the same turn Sengir Vampire damaged it. Adding a +1/+1 counter');
            card.tokens.push(damagedCreatureId); // Save the gId of the creature that died
            nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [], id: 'token-' + randomId('e') });
            card.turnAttack  += card.tokens.length; // Do it immediately too (because the effect won't run until next state change)
            card.turnDefense += card.tokens.length;
          }
        } 

      } else { // +1/+1 token effect
        card.turnAttack  += card.tokens.length;
        card.turnDefense += card.tokens.length;
      }

    }
  }

  function c000118_Incinerate() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = [ ...targetCreatures().map(c => c.gId), 'playerA', 'playerB'];
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetCreatures, targetId } = getShorts(nextState);
      const targetCreature = targetCreatures().find(c => c.gId === targetId);  // Deals 3 points of damage to player1/2
      if      (targetId === 'player1') { nextState.player1.life -= 3; addLifeChange(nextState, '1', 3, card, 500); }
      else if (targetId === 'player2') { nextState.player2.life -= 3; addLifeChange(nextState, '2', 3, card, 500); }
      else if (targetCreature) {
        targetCreature.turnDamage += 3; // Deals 3 points of damage to target creature
        if (targetCreature.turnCanRegenerate) {
          targetCreature.turnCanRegenerate = false;
          nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: [targetCreature.gId], id: randomId('e') });
        }
      }
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
    card.onEffect = (nextState, effectId) => { // Damaged creature loses regenerate until the end of turn
      const effect = nextState.effects.find(e => e.id === effectId);
      const targetCreature = nextState.cards.find(c => c.gId === effect?.targets[0]);
      if (targetCreature) { targetCreature.turnCanRegenerate = false; }
    };
  }

  function c000123_DrainLife() {
    card.getSummonCost = (nextState) => {
      const { targetCreatures, card } = getShorts(nextState);
      const possibleTargets = [ ...targetCreatures().map(c => c.gId), 'playerA', 'playerB'];
      return { mana: card.cast, xMana: [0,0,0,1,0,0], neededTargets: 1, possibleTargets };
    };    
    card.onSummon = (nextState) => {
      const { targetCreatures, targetId, card, cardPlayer } = getShorts(nextState);
      let lifeToGain = -card.xValue;
      const targetCreature = targetCreatures().find(c => c.gId === targetId);  // Deals X points of damage to player1
      if      (targetId === 'player1') { nextState.player1.life -= card.xValue; addLifeChange(nextState, '1', card.xValue, card, 0); }
      else if (targetId === 'player2') { nextState.player2.life -= card.xValue; addLifeChange(nextState, '2', card.xValue, card, 0); }
      else if (targetCreature) {
        const maxDamage = targetCreature.turnDefense - targetCreature.turnDamage;
        if (maxDamage < card.xValue) { lifeToGain = -maxDamage; } // You cannot gain more life than the creature's current toughness
        targetCreature.turnDamage += card.xValue; // Deals X points of damage to target creature
      }
      addLifeChange(nextState, cardPlayer.num, lifeToGain, card, 0); // Gain life
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    }
  }

  function c000030_HowlingMine() {
    card.onSummon = (nextState) => { // Each player draws 1 extra card during his/her draw phase
      nextState.effects.push({ scope: 'permanent', trigger: 'onEndDraw', gId, targets: [], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    };
    card.onEffect = (nextState, effectId) => {
      drawCard(nextState, nextState.turn); // Turn player extra draw
    };
  }

  function c000064_ManaFlare() {
    card.onSummon = (nextState) => { // When a player taps a land for mana, it produces 1 extra mana of the same type
      nextState.effects.push({ scope: 'permanent', trigger: 'onTapLand', gId, targets: [], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    };
    card.onEffect = (nextState, effectId, abilityCardId, params) => { // Produce extra mana
      const effect = nextState.effects.find(e => e.id === effectId);
      const land = nextState.cards.find(c => c.gId === abilityCardId);
      if (effect && land) {
        const player = land?.controller === '1' ? nextState.player1 : nextState.player2;
        if (land.color === 'blue')      { player.manaPool[1] += 1; }
        if (land.color === 'white')     { player.manaPool[2] += 1; }
        if (land.color === 'black')     { player.manaPool[3] += 1; }
        if (land.color === 'red')       { player.manaPool[4] += 1; }
        if (land.color === 'green')     { player.manaPool[5] += 1; }
        if (land.color === 'special' && params?.targets) { // Dual lands (check target it was triggered by)
          const dualLandTarget = params.targets[0] || '';
          const mana = Number.parseInt(dualLandTarget.split('custom-color-')[1]);
          player.manaPool[mana] += 1;          
        }
        if (land.id === 'c000114' && params?.targets) { // Special selection for Library of Alexandry
          const libraryOfAlexandriaTarget = params.targets[0] || '';
          if (libraryOfAlexandriaTarget === 'mana') { player.manaPool[0] += 1; }
        }
        effect.targets = []; // Immediately remove the effect on the land
      }
    };
  }

  function c000109_GauntletOfMight() {
    card.onSummon = (nextState) => { // All red creatures gain +1/+1, all mountains provide an extra red mana
      nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [], id: randomId('e') });
      nextState.effects.push({ scope: 'permanent', trigger: 'onTapLand',  gId, targets: [], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    };
    card.onEffect = (nextState, effectId, abilityCardId, params) => {
      const { tableStack } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);

      if (effect?.trigger === 'constantly') { // +1/+1 to all red creatures
        const redCreatures = tableStack.filter(c => c.isType('creature') && c.color === 'red');
        effect.targets = redCreatures.map(c => c.gId);
        redCreatures.forEach(creature => {
          creature.turnAttack += 1;
          creature.turnDefense += 1;
        });
      }
      else if (effect?.trigger === 'onTapLand') { // Extra red mana for mountains
        const land = nextState.cards.find(c => c.gId === abilityCardId);
        const player = land?.controller === '1' ? nextState.player1 : nextState.player2;
        if (land?.id === 'c000004') { player.manaPool[4] += 1; }
        effect.targets = tableStack.filter(c => c.id === 'c000004').map(c => c.gId);
      }
    };
  }
  
  function c000088_RoyalAssassin() {
    commonCreature();
    card.getAbilityCost = (nextState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = targetCreatures().filter(c => c.isTapped).map(c => c.gId); // Target = tapped creature
      return { 
        mana: [0,0,0,0,0,0], tap: true, neededTargets: 1, possibleTargets, 
        text: `Tap ${card.name} to destroy a tapped creature`,
      };
    };
    card.onAbility = (nextState) => {
      const { targetId } = getShorts(nextState);
      killCreature(nextState, targetId); // Destroy target creature
    };    
  }
  

  function c000104_SorceressQueen() {
    commonCreature();
    card.getAbilityCost = (nextState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = targetCreatures().map(c => c.gId); // Target = tapped creature
      return { 
        mana: [0,0,0,0,0,0], tap: true, neededTargets: 1, possibleTargets, 
        text: `Tap ${card.name} to make another creature 0/2`,
      };
    };
    card.onAbility = (nextState) => {
      const { card, targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'turn', trigger: 'constantly',  gId, targets: [targetId], id: randomId('e') });
    };
    card.onEffect = (nextState, effectId, abilityCardId, params) => {
      // Tap to make another creature 0/2 until the end of turn.
      // Treat this exactly as if the numbers in the lower right of the target card were 0/2.
      // All special characteristics and enchantments on the creature are unaffected.
      // (it just changes the original attack/defense, and other effects apply on that after)
      const effect = nextState.effects.find(e => e.id === effectId);
      const targetCreature = nextState.cards.find(c => c.gId === effect?.targets[0]);
      if (targetCreature) { // Check deltas in case other effects already changed them
        const attackDelta  = targetCreature.turnAttack  - targetCreature.attack; 
        const defenseDelta = targetCreature.turnDefense - targetCreature.defense;
        targetCreature.turnAttack  = 0 + attackDelta;
        targetCreature.turnDefense = 2 + defenseDelta;
      }
    };
  }
  
  // You control target creature until enchantment is discarded or game ends.
  // If target creature is already tapped it stays tapped until you can untap it.
  // If destroyed, target creature is put in its owner's graveyard
  function c000095_ControlMagic() { 
    card.getSummonCost = (nextState) => {
      const { card, tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => c.isType('creature')).map(c => c.gId);
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState) => {
      const { card, targetId } = getShorts(nextState);
      const targetCreature = nextState.cards.find(c => c.gId === targetId);
      if (targetCreature) {
        targetCreature.controller = card.controller; // Take control of the creature
        const switchLocation = targetCreature.location.slice(0,4) + targetCreature.controller;
        moveCard(nextState, targetCreature.gId, switchLocation);
      } 
      
      moveCard(nextState, gId, 'tble');
    };
    card.onDestroy = (nextState) => {
      const targetCreature = nextState.cards.find(c => c.gId === card.targets[0]);
      if (targetCreature) {
        targetCreature.controller = targetCreature.owner; // Return the creature to its owner
        moveCard(nextState, targetCreature.gId, 'tble' + targetCreature.owner);
        moveCardToGraveyard(nextState, targetCreature.gId); // Put creature to its graveyard
      }
    };
  }

  function c000085_NorthernPaladin() {
    commonCreature();
    card.getAbilityCost = (nextState) => {
      const { table } = getShorts(nextState);
      const possibleTargets = table.filter(c => c.color === 'black').map(c => c.gId); // Target = black card on the table
      return { 
        mana: [0,0,2,0,0,0], tap: true, neededTargets: 1, possibleTargets, 
        text: `Tap ${card.name} to destroy a black card`,
      };
    };
    // Destroys a black card in play. Cannot be used to cancel a black spell as it is being cast.
    card.onAbility = (nextState) => {
      const { card, targetId } = getShorts(nextState);
      const target = nextState.cards.find(c => c.gId === targetId);
      if (target?.isType('creature')) { killCreature(nextState, targetId); }
      else { moveCardToGraveyard(nextState, targetId); }
      card.targets = []; // Clean up the target once destroyed
    };
  }
  
  function c000127_ConcordantCrossroads() { 
    card.onSummon = (nextState) => {
      nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    };
    // Creatures can attack or use the abilities that include tap in the activation cost as soon as they come into play
    card.onEffect = (nextState, effectId) => {
      const { tableStack } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      if (effect) {
        const sickCreatures = tableStack.filter(c => c.isType('creature') && c.status === 'sickness');
        effect.targets = sickCreatures.map(c => c.gId); // It affects all creatures with sickness
        sickCreatures.forEach(c => c.status = null); // Remove sickness immediately
      }
    };
  }


  // You may put as many lands into play as you want each turn.
  // Fastbond does 1 damage to you for every land beyond the first that you play in a single turn
  function c000097_Fastbond() {
    card.onSummon = (nextState) => {
      const { card, cardPlayer, otherPlayer } = getShorts(nextState);      
      card.tokens = []; // Every token represents the first land put into play during the current turn for the player
      if (cardPlayer.summonedLands  > 0) { card.tokens.push(cardPlayer.num);  cardPlayer.summonedLands  = 0; }
      if (otherPlayer.summonedLands > 0) { card.tokens.push(otherPlayer.num); otherPlayer.summonedLands = 0; }
      nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [], id: randomId('e') });
      nextState.effects.push({ scope: 'permanent', trigger: 'onEndTurn', gId, targets: [], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    };
    card.onEffect = (nextState, effectId) => {
      const { cardPlayer, otherPlayer } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      if (effect?.trigger === 'constantly') { 

        if (cardPlayer.summonedLands > 0) { // Detecting a new land summoned
          if (card.tokens.indexOf(cardPlayer.num) >= 0) { // If token present = it's an extra land
            cardPlayer.life -= 1;
            addLifeChange(nextState, cardPlayer.num, 1, card, 700, 'Fastbond does 1 damage for every land beyond the first that you play in a single turn');
          } else { card.tokens.push(cardPlayer.num); } // Mark first land of this turn
          cardPlayer.summonedLands = 0;
        }

        if (otherPlayer.summonedLands > 0) { // Detecting a new land summoned
          if (card.tokens.indexOf(otherPlayer.num) >= 0) { // If token present = it's an extra land
            otherPlayer.life -= 1;
            addLifeChange(nextState, otherPlayer.num, 1, card, 700, 'Fastbond does 1 damage for every land beyond the first that you play in a single turn');
          } else { card.tokens.push(otherPlayer.num); } // Mark first land of this turn
          otherPlayer.summonedLands = 0;
        }        

      }
      else if (effect?.trigger === 'onEndTurn') { 
        card.tokens = []; // Remove 1st lands marks
      }
    };
  }

  // All damage you have taken from any one source this turn is added to your life total instead of subtracted from it.
  function c000156_ReverseDamage() {
    card.onStack = (nextState) => {
      const { card } = getShorts(nextState);
      if (nextState.lifeChanges[0].gId) { card.targets = [nextState.lifeChanges[0].gId]; }      
    };
    card.onSummon = (nextState) => {
      const { card, cardPlayer, otherPlayer } = getShorts(nextState);
      if (nextState.lifeChanges.length) {
        const currentLifeChange = nextState.lifeChanges[0];
        const originalDamage = currentLifeChange.originalDamage;
        if (originalDamage > 0) {
          cardPlayer.life += originalDamage;
          if (currentLifeChange.damage > 0) { currentLifeChange.damage = 0; } // Cancel damage
          currentLifeChange.damage -= originalDamage; // Add damage as life
          currentLifeChange.text   = `The damage has been reverted and now it's added as life (Reverse Damage)`;
          currentLifeChange.opText = `The damage has been reverted and now it's added as life (Reverse Damage)`;
        }
      }
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
  }

  // Can be cast only when a creature, spell or effect does damage to you.
  // Eye for an eye does an equal amount of damage to the controller of that creature, spell or effect.
  // If some spell or effect reduces the amount of damage you receive, it does not reduce the damage dealt by eye for an eye.
  function c000062_EyeForAnEye() {
    card.onStack = (nextState) => {
      const { card } = getShorts(nextState);
      if (nextState.lifeChanges[0].gId) { card.targets = [nextState.lifeChanges[0].gId]; }
    };
    card.onSummon = (nextState) => {
      const { card, cardPlayer, otherPlayer } = getShorts(nextState);
      if (nextState.lifeChanges.length) {
        const currentLifeChange = nextState.lifeChanges[0];
        const originalDamage = currentLifeChange.originalDamage;
        const sourceCard = nextState.cards.find(c => c.gId === currentLifeChange.gId);
        if (originalDamage > 0) {
          let player = otherPlayer;
          if (sourceCard?.controller === '1') { player = nextState.player1; }
          if (sourceCard?.controller === '2') { player = nextState.player2; }
          player.life -= originalDamage;
          addLifeChange(nextState, player.num, originalDamage, card, 0, currentLifeChange.text, currentLifeChange.opText);
        }
      }
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
  }

  // Select any artifact in play. This enchantment acts as a duplicate of that artifact; 
  // it is afected by cards that affect either enchantments or artifacts.
  // The copy remains even if the original artifact is destroyed.
  // Enchantments on the original artifact are not copied
  function c000096_CopyArtifact() {
    let cardOverride: TGameCard;

    replicate(); // If the target is already set, copy all properties & functions from the target card
    
    function replicate() {
      if (card.copyId) {
        const dbTargetCard = dbCards.find(c => c.id === card.copyId) || {}; // Target DB properties (ID included)
        cardOverride = extendCardLogic({...card, ...dbTargetCard, id: card.copyId}) as TGameCard;      
        Object.keys(cardOverride).forEach(key => { // Copy all properties from cardOverride --- to ---> card
          const excludeProps = ['id', 'copyId', 'cast', 'name'];
          if (excludeProps.indexOf(key) < 0) {
            // @ts-ignore: Unreachable code error
            card[key] = cardOverride[key as keyof TGameCard];
          }
        });
        isAlsoType('enchantment'); // Keep the enchantment type
      }
    }

    card.getSummonCost = (nextState) => {
      const { table } = getShorts(nextState);
      const possibleTargets = table.filter(c => c.isType('artifact')).map(c => c.gId); // Target = artifact in play
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState) => {
      const { card, targetId } = getShorts(nextState);
      const targetArtifact = nextState.cards.find(c => c.gId === targetId);
      if (targetArtifact) {
        card.targets = [];
        card.copyId = targetArtifact.id;
        replicate();
        cardOverride?.onSummon(nextState); // Call the overriden .onSummon()
      }
    };
    card.onDestroy = (nextState) => {
      const { card } = getShorts(nextState);
      cardOverride?.onDestroy(nextState);
      delete card.copyId; // Uncopy it
    };
  }


  // Uppon summoning, Clone acquires all characteristics, including color, of any one creature in play on either side;
  // any creature enchantments on original creature are not copied.
  // Clone retains these characteristics even after original creature is destroyed.
  function c000094_Clone() {
    let cardOverride: TGameCard;

    replicate(); // If the target is already set, copy all properties & functions from the target card
    
    function replicate(copyId = card.copyId) {
      if (copyId) {
        const dbTargetCard = dbCards.find(c => c.id === copyId) || {}; // Target DB properties (ID included)
        cardOverride = extendCardLogic({...card, ...dbTargetCard, id: copyId}) as TGameCard;      
        Object.keys(cardOverride).forEach(key => { // Copy all properties from cardOverride --- to ---> card
          const excludeProps = ['id', 'copyId', 'cast', 'name'];
          if (excludeProps.indexOf(key) < 0) {
            // @ts-ignore: Unreachable code error
            card[key] = cardOverride[key as keyof TGameCard];
          }
        });
        card.turnAttack  = card.attack || 0;
        card.turnDefense = card.defense || 0;
        card.turnLandWalk = card.landWalk;
        card.turnCanRegenerate = card.canRegenerate;
      }
    }

    card.getSummonCost = (nextState) => {
      const { table } = getShorts(nextState);
      const possibleTargets = table.filter(c => c.isType('creature')).map(c => c.gId); // Target = creature in play
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState) => {
      const { card, targetId } = getShorts(nextState);
      const cardToCopy = nextState.cards.find(c => c.gId === targetId);
      if (cardToCopy) {
        card.targets = [];
        card.copyId = cardToCopy.id;
        replicate();
        cardOverride?.onSummon(nextState); // Call the overriden .onSummon()
      }
    };
    card.onDestroy = (nextState) => {
      const { card } = getShorts(nextState);
      cardOverride?.onDestroy(nextState);
      delete card.copyId; // Uncopy it
    };
  }


  // Any sorcery or instant spell just cast is doubled.
  // Treat Fork as an exact copy of target spell except that Fork remains red.
  // Copy and original may have different targets
  function c000029_Fork() {
    card.allowMultiCast = true; // Stack won't switch to playerB immediately at start
    card.dynamicCost = true;    // The summoning cost will be recalculated each try
    let cardOverride: TGameCard;

    replicate(); // If the target is already set, copy all properties & functions
    
    function replicate(copyId = card.copyId) {
      if (copyId) {
        const dbTargetCard = dbCards.find(c => c.id === copyId) || {}; // Target DB properties
        cardOverride = extendCardLogic({...card, ...dbTargetCard, id: copyId}) as TGameCard;      
        Object.keys(cardOverride).forEach(key => {
          const excludeProps = ['id', 'copyId', 'cast', 'name', 'image'];
          if (excludeProps.indexOf(key) < 0) {
            // @ts-ignore: Unreachable code error
            card[key] = cardOverride[key as keyof TGameCard];
          }
        });
        card.name = copyId === 'c000029' ? 'Fork' : 'Forked ' + cardOverride.name;
        card.color = 'red';
      }

      card.onTarget = (state, params: TActionParams) => {
        const { card } = getShorts(state);
        if (!card.copyId && params.targets && params.targets.length === 1) {
          const targetId = params.targets[0];
          const cardToCopy = state.cards.find(c => c.gId === targetId);
          if (cardToCopy) {
            card.copyId = cardToCopy.id;
            card.xValue = cardToCopy.xValue;
            params.targets.pop();
            replicate();
          }
        }
      };
      card.onCancel = (state) => {
        delete card.copyId;
        replicate(card.id); // Set all Fork props back
      };
  
      card.getSummonCost = (nextState: TGameState) => {
        const { card, stack } = getShorts(nextState);
        const possibleTargets = stack.filter(c => c.isType('instant', 'sorcery')).map(c => c.gId);
        const cost: TActionCost = { mana: card.cast, neededTargets: 1, possibleTargets };  // Initial target (spell to copy)

        if (card.copyId) { // If copy target set, replace targets
          const copyCost = cardOverride?.getSummonCost(nextState);
          cost.possibleTargets = copyCost?.possibleTargets || [];
          cost.neededTargets   = copyCost?.neededTargets || 0;
          if (copyCost?.customDialog) { cost.customDialog = copyCost.customDialog };
        }

        return cost;
      };
      
      card.getCost = (nextState, action) => {
        if (action === 'summon-spell')    { return card.getSummonCost(nextState); }
        if (action === 'trigger-ability') { return card.getAbilityCost(nextState); }
        if (action === 'pay-upkeep')      { return card.getUpkeepCost(nextState); }
        return null;
      }
  
      card.onDestroy = (nextState) => {
        const { card } = getShorts(nextState);
        cardOverride?.onDestroy(nextState);
        delete card.copyId; // Uncopy it
        replicate(card.id); // Set all Fork props back
      };
    }

  }


  function c000132_PsychicVenom() {
    card.getSummonCost = (nextState: TGameState) => {
      const { table } = getShorts(nextState);
      const possibleTargets = table.filter(c => c.isType('land')).map(c => c.gId); // Target = land
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'permanent', trigger: 'onTapLand', gId, targets: [targetId], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    }
    card.onEffect = (nextState, effectId, abilityCardId, params) => {
      const { targetId } = getShorts(nextState);
      if (abilityCardId === targetId) {
        const land = nextState.cards.find(c => c.gId === abilityCardId);
        if (land) {
          const player = land?.controller === '1' ? nextState.player1 : nextState.player2;
          player.life -= 2; addLifeChange(nextState, player.num, 2, land, 500);
        }
      }
    };
  }

  function c000140_DesertTwister() { // Destroy any card in play
    card.getSummonCost = (nextState: TGameState) => {
      const { tableStack, noProtection } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => noProtection(c)).map(c => c.gId);
      return { mana: card.cast, neededTargets: 1, possibleTargets }; // Target = any card in play
    };       
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      destroyCard(nextState, targetId);     // Destroy target
      moveCardToGraveyard(nextState, gId);  // Destroy itsef
    };
  }

  function c000143_Flashfires() { // All plains in play are destroyed
    card.onSummon = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      tableStack.filter(c => c.isType('plains')).forEach(c => destroyCard(nextState, c.gId)); // Destroy plains
      moveCardToGraveyard(nextState, gId);  // Destroy itsef
    };
  }

  function c000144_ForceOfNature() {
    commonCreature();
    card.getUpkeepCost = (nextState) => {
      const text = 'You must pay 4 green mana or Force of Nature does 8 damage to you';
      const opText = 'Player opponent is paying Force of Nature upkeep';
      const skipText = `Don't pay and get 8 damage`;
      return { mana: [0,0,0,0,0,4], text, opText, canSkip: true, skipText };
    }
    card.onUpkeep = (nextState, skip) => {
      const { card, cardPlayer } = getShorts(nextState);
      if (skip) {  // If upkeep not paid: 8 damage 
        cardPlayer.life -= 8; 
        addLifeChange(nextState, cardPlayer.num, 8, card, 500, 'Force of Nature damages you', 'Force of Nature damages opponent');
      }
    };
  }

  function c000145_FrozenShade() {
    commonCreature();
    card.getAbilityCost = () => ({ mana: [0,0,0,0,0,0], xMana: [0,0,0,1,0,0], tap: false, text: `Pay 1 black mana to add +1/+1` });
    card.onAbility = (nextState: TGameState) => {
      nextState.effects.push({ scope: 'turn', trigger: 'constantly', gId, targets: [], id: randomId('e'), xValue: card.xValue });
      card.xValue = 0;
    };
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+1
      const { card } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      card.turnAttack += effect?.xValue || 0;
      card.turnDefense += effect?.xValue || 0;
    };
  }

  function c000146_HealingSalve() { // Gain 3 life, or prevent up to 3 damage from being dealt to a single target
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = [ ...targetCreatures().map(c => c.gId), 'playerA'];
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetCreatures, targetId } = getShorts(nextState);
      const targetCreature = targetCreatures().find(c => c.gId === targetId);      
      
      if      (targetId === 'player1') { nextState.player1.life += 3; addLifeChange(nextState, '1', -3, card, 500); } // You gain 3 life
      else if (targetId === 'player2') { nextState.player2.life += 3; addLifeChange(nextState, '2', -3, card, 500); } // You gain 3 life
      else if (targetCreature) { targetCreature.turnDamage -= 3; } // Prevent 3 damage to a creature 
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
  }

  function c000147_HolyStrength() {
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = targetCreatures().map(c => c.gId); // Target = any playing creature
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [targetId], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +1/+2 to target creature
      const { targetCreatures } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetCreature = targetCreatures().find(c => c.gId === effectTargetId);
      if (targetCreature) {
        targetCreature.turnAttack += 1;
        targetCreature.turnDefense += 2;
      }
    };
  }

  function c000148_Hurricane() { // All players and flying creatures suffer X damage
    card.getSummonCost = (nextState: TGameState) => {
      const { card } = getShorts(nextState);
      return { mana: card.cast, xMana: [1,1,1,1,1,1], neededTargets: 0, possibleTargets: [] };
    };    
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, card, cardPlayer, otherPlayer } = getShorts(nextState);      
      tableStack.filter(c => c.isType('creature') && c.isFlying).forEach(creature => {
        creature.turnDamage += card.xValue; // Deals X points of damage to each flying creature
      });
      nextState.player1.life -= card.xValue; // Deals X points of damage to player1
      nextState.player2.life -= card.xValue; // Deals X points of damage to player2
      addLifeChange(nextState, otherPlayer.num, card.xValue, card, 0);
      addLifeChange(nextState, cardPlayer.num,  card.xValue, card, 0);
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    }
  }
  
  function c000149_JayemdaeTome() {
    card.getAbilityCost = () => ({ mana: [4,0,0,0,0,0], tap: true, text: `Use ${card.name} to draw one extra card` });
    card.onAbility = (nextState) => {
      const { cardPlayer } = getShorts(nextState);
      drawCard(nextState, cardPlayer.num); // Draw one extra card
    };
  }

  function c000150_Karma() { // During every player's upkeep, does 1 damage for every swamp he/she has.
    card.getUpkeepCost = (nextState) => {
      const { table } = getShorts(nextState);
      const upkeepPlayerNum = nextState.turn; // Presume this runs only during playerA's upkeep
      const numOfSwamps = table.filter(c => c.controller === upkeepPlayerNum && c.isType('swamp')).length;
      let text = `Karma does ${numOfSwamps} damage to you, because you have ${numOfSwamps} swamps in play`;
      let opText = `Karma does ${numOfSwamps} damage to your opponent, because he/she has ${numOfSwamps} swamps in play`;
      return { mana: [0,0,0,0,0,0], text, opText };
    }
    card.onUpkeep = (nextState, skip, targets, upkeepPlayerNum) => {
      const { otherPlayer, table } = getShorts(nextState);
      const numOfSwamps = table.filter(c => c.controller === upkeepPlayerNum && c.isType('swamp')).length;
      const damage = numOfSwamps;
      otherPlayer.life -= damage;
      addLifeChange(nextState, upkeepPlayerNum, damage, card, 200);
    };
  }

  function c000153_Onulet() {
    commonCreature();
    isAlsoType('artifact');
    card.onDestroy = (nextState) => { // If Onulet is placed in the graveyard, its controller gains 2 life
      const { card, cardPlayer } = getShorts(nextState);
      cardPlayer.life += 2;
      addLifeChange(nextState, cardPlayer.num, -2, card, 0);
    };
  }

  function c000155_Reconstruction() { // Bring one artifact from your graveyard to your hand
    card.hideTargetsOnStack = true; // Hides selected card to opponent
    card.getSummonCost = (nextState: TGameState) => {
      const { card, cardPlayer, graveyard } = getShorts(nextState);
      const possibleTargets = graveyard.filter(c => c.controller === cardPlayer.num && c.isType('artifact')).map(c => c.gId); // Artifacts from your grav
      return { mana: card.cast, customDialog: 'Reconstruction', neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { card, targetId } = getShorts(nextState);
      moveCard(nextState, targetId, 'hand'); // Move selected card to your hand
      card.targets = [];
      moveCardToGraveyard(nextState, gId); // Destroy itself
    };
  }

  function c000158_StreamOfLife() { // Target player gains X life
    card.getSummonCost = (nextState: TGameState) => {
      const {card } = getShorts(nextState);
      return { mana: card.cast, xMana: [1,1,1,1,1,1], neededTargets: 1, possibleTargets: ['playerA', 'playerB'] };
    };    
    card.onSummon = (nextState: TGameState) => {
      const { targetId, card } = getShorts(nextState);
      if      (targetId === 'player1') { nextState.player1.life += card.xValue; addLifeChange(nextState, '1', -card.xValue, card, 500); }
      else if (targetId === 'player2') { nextState.player2.life += card.xValue; addLifeChange(nextState, '2', -card.xValue, card, 500); }
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };
  }

  function c000159_Tranquility() { // All enchantments in play must be discarded
    card.onSummon = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      tableStack.filter(c => c.isType('enchantment')).forEach(enchantment => {
        moveCardToGraveyard(nextState, enchantment.gId);
      });
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };
  }

  function c000160_Tsunami() { // All Islands in play are destroyed
    card.onSummon = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      tableStack.filter(c => c.isType('island')).forEach(island => {
        moveCardToGraveyard(nextState, island.gId);
      });
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };
  }

  function c000161_WallOfBone()     { 
    commonCreature(); 
    addRegenerateAbility();
    card.getAbilityCost = () => ({ mana: [0,0,0,1,0,0], tap: false, text: `Pay 1 black mana to regenerate ${card.name}` });
  }

  function c000162_WallOfBrambles() {
    commonCreature(); 
    addRegenerateAbility();
    card.getAbilityCost = () => ({ mana: [0,0,0,0,0,1], tap: false, text: `Pay 1 green mana to regenerate ${card.name}` });
  }

  function c000168_CopperTablet() { // Does 1 damage to each player during his/her upkeep
    card.getUpkeepCost = (nextState) => {
      let text = `Copper Tablet does 1 damage to you during your upkeep`;
      let opText = `Copper Tablet does 1 damage to your oppoennt during his/her upkeep`;
      return { mana: [0,0,0,0,0,0], text, opText };
    }
    card.onUpkeep = (nextState, skip, targets, upkeepPlayerNum) => {
      const { otherPlayer, table } = getShorts(nextState);
      otherPlayer.life -= 1;
      addLifeChange(nextState, upkeepPlayerNum, 1, card, 200);
    };
  }

  function c000169_IceStorm() { // Destroys any one land
    card.getSummonCost = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => c.isType('land')).map(c => c.gId);
      return { mana: card.cast, neededTargets: 1, possibleTargets }; // Target = any land in play
    };       
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      destroyCard(nextState, targetId);     // Destroy target
      moveCardToGraveyard(nextState, gId);  // Destroy itsef
    };
  }

  function c000171_Cleanse() { // All black creatures in play are destroyed
    card.onSummon = (nextState: TGameState) => {
      const { tableStack, card, noProtection } = getShorts(nextState);
      tableStack.filter(c => c.isType('creature') && c.color === 'black' && noProtection(c)).forEach(creature => {
        console.log(`Creature ${creature.gId} ${creature.name} is destroyed`);
        killCreature(nextState, creature.gId);
      });
      moveCardToGraveyard(nextState, card.gId); // Destroy itself
    };
  }

  function c000172_DivineOffering() { // Destroy target artifact. You gain life points equal to casting cost of the artifact
    card.getSummonCost = (nextState: TGameState) => {
      const { tableStack } = getShorts(nextState);
      const possibleTargets = tableStack.filter(c => c.isType('artifact')).map(c => c.gId);
      return { mana: card.cast, neededTargets: 1, possibleTargets }; // Target = any artifact
    };       
    card.onSummon = (nextState: TGameState) => {
      const { targetId, cardPlayer } = getShorts(nextState);
      const targetArtifact = nextState.cards.find(c => c.gId === targetId);
      if (targetArtifact) { 
        const totalCast = targetArtifact.cast.reduce((a,v) => a + v, 0);
        cardPlayer.life += totalCast;
        addLifeChange(nextState, cardPlayer.num, -totalCast, targetArtifact, 0);
        destroyCard(nextState, targetId); // Destroy target artifact
      }
      moveCardToGraveyard(nextState, gId);  // Destroy itsef
    };
  }

  function c000173_DivineTransformation() { // Target creature gains +3/+3
    card.getSummonCost = (nextState: TGameState) => {
      const { targetCreatures } = getShorts(nextState);
      const possibleTargets = targetCreatures().map(c => c.gId); // Target = any playing creature
      return { mana: card.cast, neededTargets: 1, possibleTargets };
    };
    card.onSummon = (nextState: TGameState) => {
      const { targetId } = getShorts(nextState);
      nextState.effects.push({ scope: 'permanent', trigger: 'constantly', gId, targets: [targetId], id: randomId('e') });
      moveCard(nextState, gId, 'tble');
    }
    card.onEffect = (nextState: TGameState, effectId: string) => { // Add +3/+3 to target creature
      const { targetCreatures } = getShorts(nextState);
      const effect = nextState.effects.find(e => e.id === effectId);
      const effectTargetId = effect?.targets[0]; // The card that the card's effect is targetting
      const targetCreature = targetCreatures().find(c => c.gId === effectTargetId);
      if (targetCreature) {
        targetCreature.turnAttack  += 3;
        targetCreature.turnDefense += 3;
      }
    };
  }
  
  function c000170_Moat() { // Non-flying creatures cannot attack

  }

  // 
  
  // Pending to be coded ..... 
  
  function c000106_VesuvanDoppelganger() { }
  function c000098_Fireball() { }
  function c000113_TheAbyss() { }
  function c000117_BalduvianHorde() { }
  function c000121_MishrasFactory() { }
  function c000129_GiantTortoise() { }
  function c000130_TimeElemental() { }
  function c000138_Balance() {}
  function c000141_DingusEgg() {}
  function c000142_DisruptingScepter() {}
  function c000151_NetherShadow() {}
  function c000167_WinterOrb() {}
  function c000174_Mightstone() {}
  function c000175_StripMine() {}

  return card;
}




