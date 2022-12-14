/*
	A soldier goes to war.
	They belong to a formation.
	
	Individual soldiers have no 'class'.
	However, players can customize soldiers, either individually or with 'templates'.
	
	HP Design Philosophy:
		A generic unit at parity should die to 5 direct hits.
		We take it extrapolating from several data points:
			-In wesnoth, 2-3 hits at parity are a kill.
			-A 1-hit kill is a glass cannon.
			-20 hits to kill is far too thick.
	
	-a single pool of HP, but different body parts have different armor and damage modifier
		
	-this should emergently cause the player to rediscover the rules of armor, in terms of most protection per unit price.
		-sauce: https://acoup.blog/2019/05/03/collections-armor-in-order-part-i/
	Head->Chest->Hips, Thighs, Shoulders->Legs,Arms->Hands,Feet
	which also works as a FIFO stack. as in, ie, you see reiters losing plate greaves and donning a 'half-plate', and then finally culminating into a simple cuirass, and in WWI only a helmet.
	
	Usually neck protection is done with cloaks, until you get to full plate armor.
	
	But seriously, most of the time you're only going to care about head/chest protection, the rest is basically cosmetic.
	
	Heavy infantry moves at the same speed as light infantry, but *FATIGUES* faster if they aren't used to the weight. Also mud is fatal.
	Light Infantry:
		Tunic, Sling
	Medium Infantry:
		Mail, Sword, Shield
	Heavy Infantry:
		Plate, Heavy Weapons
	General progression:
		Light Infantry -> Medium Infantry -> Heavy Infantry
	
	Intro scenario: ambush of armored warriors to capture their armaments.
	
	TODO: more indicators/animations for damage and a way for players to get more information about which armor works and which don't.
		-I'm not going to force players to do baysesian stats, they should see on the battlefield how armor affects them.
		
	TODO:
		unify body parts. redesign and finish design for body parts.
	TODO:
		lazy eval for armor, precalculate protection for various body parts
	TODO:
		Ungeneralize equipment and reduce to a simpler 6 point slot.
	TODO: SoldierLogMessage
	TODO: idea: soldiers are only "wounded" after a battle if the formation survives.

	TODO: "miss!" indicator
	
	TODO: maxHealth based on attributes
	
	TODO: Army Mgmt Screen, with Templates that automates much of the work.
		-Equip and build one soldier to build them all!
			-Equipment can be "cash convertible" at settlements/merchants etc, up to a limited amounted.
				You're still only going to have a limited amount of shiny plate knights, so use it wisely!
		-Oh, and return equipment to armory of respective teams after war.
	
	TODO: just reimplement BB layers
	
	? Tower Defense ?
 */
const Soldiers = (function()
{
	const MIN_DAMAGE = 1;
	const DEFAULT_MIN_DAMAGE = 5;
	const DEFAULT_MAX_DAMAGE = 10;
	const BASE_HIT_CHANCE_PERCENT = 35;
	const BASE_MOVEMENT = 2;
	const BASE_ATTRIBUTE = 20;
	const MAX_ATTRIBUTE = 100;
	const BASE_WEAPON_SKILL = 30;
	const MAX_WEAPON_SKILL = 100;
	
	const BASE_ATTACK_FATIGUE_COST = 10;
	const BASE_ENDTURN_FATIGUE = 5;
	const BASE_FATIGUE_STAGE = 50;
	
	/*
		Hitchance:
 		
		Head 	= 0.20
		//Neck	= 0.05
		Chest 	= 0.40
		Groin	= 0.20
		Arms 	= 0.05
		Legs 	= 0.05
		//Hands 	= 0.03
		//Feet 	= 0.02
	 */
	const BODY_PARTS_HIT_CHANCE = {
		"head": 5,
		"chest": 12,
		"groin": 5,
		"arms": 3,
		"legs": 2
	}
	
	const BODY_PARTS_DAMAGE_MODIFIER = {
		"head": 2.0,
		"chest": 1.0,
		"groin": 1.2,
		"arms": 0.8,
		"legs": 0.8
	}
	
	const backstoriesStatistics = {
		"veteran": {
			"localization_string": "background_veteran",
			"attributes": {
				"strength": { "min": 20, "max": 25},
				"endurance": { "min": 25, "max": 30},
				"constitution": { "min": 20, "max": 25},
				"coordination": { "min": 20, "max": 25},
				"agility": { "min": 15, "max": 25},
				"charisma": { "min": 15, "max": 25},
			},
		},
	}
	
	const statusEffectsStatistics = {
		// TODO:
	}
	
	var unitDesignerEquipment = [];
	
	return {
		/*
			Object factories, generic and specific.
			NOTE: do not create it directly from here. This is a factory function.
			Use Game.createNewIDObject instead!
		 */
		
		// generic template. do NOT use this as is.
		createSoldier: function(team = 1)
		{
			let soldier = {};
			
			/*
				skeletons don't have names. 
				goblins are named Gork and Mork,
				humans have names like John and Ariel.
				tis better for names to be delegated to specific constructors.
			 */
			soldier.name = null;
			// same deal with gender, though there are different options: M, F, N, and N/A (null).
			soldier.gender = null;
			
			soldier.HP = 100;
			soldier.maxHP = 100;
			soldier.fatigue = 0;
						
			// attributes
			soldier.attributes = {};
			soldier.attributes.strength = BASE_ATTRIBUTE; // damage
			soldier.attributes.endurance = BASE_ATTRIBUTE; // fatigue
			soldier.attributes.constitution = BASE_ATTRIBUTE; // HP
			soldier.attributes.coordination = BASE_ATTRIBUTE; // weapon skills
			soldier.attributes.agility = BASE_ATTRIBUTE; // dodge
			soldier.attributes.charisma = BASE_ATTRIBUTE; // leadership
			
			// TODO: weapon skills like this are kind of punishing,
				// in that it restricts the abilities of players to innovate.
				// by that means, weapon skills should matter, but a knight SHOULD be proficient with any weapon.
			// skills
			soldier.skills = {};
			soldier.skills.oneHanded = BASE_WEAPON_SKILL;
			soldier.skills.twoHanded = BASE_WEAPON_SKILL;
			soldier.skills.sword = BASE_WEAPON_SKILL;
			soldier.skills.spear = BASE_WEAPON_SKILL;
			soldier.skills.greatsword = BASE_WEAPON_SKILL;
			soldier.skills.polearm = BASE_WEAPON_SKILL;
			soldier.skills.bow = BASE_WEAPON_SKILL;
			soldier.skills.sling = BASE_WEAPON_SKILL;
			soldier.skills.crossbow = BASE_WEAPON_SKILL;
			
			soldier.isDead = false;
			soldier.killedByID = null;
			
			soldier.team = team;
			soldier.formationID = null;
			soldier.isOfficer = false;
			soldier.officerID = null; // if soldier is an officer, additional stats here.
			
			// equipment slots...?
			/*
				Layers: Under, Over, Armor, Cover
			 */
			soldier.equipment = [];
			soldier.effects = [];
			soldier.traits = [];
			soldier.backstory = "";
			soldier.log = [];
			
			soldier.totalKills = 0;
			soldier.totalDamageDealt = 0;
			soldier.totalDamageReceived = 0;
			soldier.totalDamageHealed = 0;
			soldier.totalTilesMoved= 0;
			
			return soldier;
		},
		
		createSoldierVeteran: function()
		{
			let soldier = Soldiers.createSoldier();
			// TEMP: replace in preparation for battle nuns, this is testing for now
			soldier.gender = randomElementInArray(["M","F","N"]);
			let name;
			if(soldier.gender === "M")
			{
				name = NameGenerator.generateHumanMaleName();
			}
			else if (soldier.gender === "F")
			{
				name = NameGenerator.generateHumanFemaleName();
			}
			else 
			{
				name = NameGenerator.generateHumanName();
			}
			soldier.name = name;
			soldier.backstory = "veteran";
			
			return soldier;
		},
		
		createSoldierUndead: function()
		{
			let soldier = Soldiers.createSoldier();
			
			soldier.backstory = "undead";
			
			return soldier;
		},
		
		/* Getters */
		getSoldierByID: function(soldierID)
		{
			return Game.getIDObject("soldiers", soldierID);
		},
		
		getSoldiers: function()
		{
			return Game.getState("soldiers");
		},
		
		getLivingSoldiersID: function()
		{
			let soldiers = Soldiers.getSoldiers();
			
			let livingSoldiers = [];
			for(let index = 0; index < soldiers.length; index++)
			{
				let soldier = soldiers[index];
				if(!soldier.isDead)
				{
					livingSoldiers.push(soldier.ID);
				}
			}
			
			return livingSoldiers;
		},
		
		getLivingSoldiersIDByTeam: function(team)
		{
			let soldiers = Soldiers.getSoldiers();
			
			let livingSoldiers = [];
			for(let index = 0; index < soldiers.length; index++)
			{
				let soldier = soldiers[index];
				if(!soldier.isDead && soldier.team === team)
				{
					livingSoldiers.push(soldier.ID);
				}
			}
			
			return livingSoldiers;
		},
		
		// note: null IS a valid value, and applies to skeletons.
		getSoldierNameByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "name");
		},
		
		// ditto, null is a separate and DISTINCT value from N for enby.
		getSoldierGenderByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "gender");
		},
		
		getSoldierImageByID: function(soldierID)
		{
			// TODO: placeholder, to be replaced with dynamic sprites.
			let image = Assets.getImage("spearman");
			if(Soldiers.isSoldierRangedByID(soldierID)) return Assets.getImage("archer");
			if(Soldiers.isSoldierMountedByID(soldierID)) return Assets.getImage("horseman");
			return image;
		},
		
		getSoldierFormationIDByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "formationID");
		},
		
		getSoldierPositionByID: function(soldierID)
		{
			let formationID = Soldiers.getSoldierFormationIDByID(soldierID);
			if(formationID === null) return null;
			return Pieces.getPiecePositionByID(formationID);
		},
		
		getSoldierHPByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "HP");
		},
		
		getSoldierMaxHPByID: function(soldierID)
		{
			let maxHP = Game.getIDObjectProperty("soldiers", soldierID, "maxHP");
			return maxHP;
		},
		
		getSoldierMovementByID: function(soldierID)
		{
			let mount = Soldiers.getSoldierMountKeyByID(soldierID);
			if(mount)
			{
				return Equipment.getMountMovementByKey(mount);
			}
			return BASE_MOVEMENT;
		},
		
		getSoldierFatigueByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "fatigue");
		},
		
		// how much fatigue a soldier can handle
		getSoldierFatigueStageCapacityByID: function(soldierID)
		{
			let capacity = BASE_FATIGUE_STAGE;
			capacity += Soldiers.getSoldierAttribute(soldierID, "endurance");
			return capacity;
		},
		
		getSoldierFatigueStageByID: function(soldierID)
		{
			let fatigue = Soldiers.getSoldierFatigueByID(soldierID);
			let stageCapacity = Soldiers.getSoldierFatigueStageCapacityByID(soldierID);
			
			if(fatigue < stageCapacity)
			{
				return 0; // rested 
			}
			else if(fatigue < stageCapacity * 2)
			{
				return 1; // winded
			}
			else if(fatigue < stageCapacity * 3)
			{
				return 2; // tired
			}
			else 
			{
				return 3; // exhausted
			}
		},
		
		getSoldierAttackByID: function(soldierID)
		{
			let attack = 0;
			// first, base attack based on coordination attribute
			attack += Soldiers.getSoldierAttribute(soldierID, "coordination") / 2;
			// next, weapon skill, if applicable.
			let weaponType = Soldiers.getSoldierWeaponTypeByID(soldierID);
			// if no weapon type, all that means is that the soldier has nothing equipped. So do nothing.
			if(weaponType)
			{
				let weaponSkill = Soldiers.getSoldierSkill(soldierID, weaponType);
				attack += weaponSkill/4;
			}
			// diminish attack base on fatigue 
			let fatiguePenalty = Soldiers.getSoldierFatigueStageByID(soldierID);
			if(fatiguePenalty > 0)
			{
				attack *= (1 - 0.10 * fatiguePenalty);
			}
			
			return attack;
		},
		
		getSoldierDefenseByID: function(soldierID)
		{
			let defense = 0;
			// first, base defense based on coordination attribute
			defense += Soldiers.getSoldierAttribute(soldierID, "coordination") / 2;
			// TODO: add shield bonuses here later...
			return defense;
		},
		
		// always returns a valid {min:x,max:y} pair.
		getSoldierWeaponMinMaxDamageByID: function(soldierID)
		{
			let weaponKey = Soldiers.getSoldierWeaponKeyByID(soldierID);
			let damage = {min: DEFAULT_MIN_DAMAGE, max: DEFAULT_MAX_DAMAGE};
			if(weaponKey)
			{
				damage.min = Equipment.getEquipmentMinDamageByKey(weaponKey);
				damage.max = Equipment.getEquipmentMaxDamageByKey(weaponKey);
			}
			return damage;
		},
		
		isSoldierRangedByID: function(soldierID)
		{
			let weaponKey = Soldiers.getSoldierWeaponKeyByID(soldierID);
			if(!weaponKey) return false;
			return Equipment.isWeaponRangedByKey(weaponKey);
		},
		
		isSoldierMountedByID: function(soldierID)
		{
			let mountKey = Soldiers.getSoldierMountKeyByID(soldierID);
			if(mountKey) return true;
			return false;
		},
		
		getSoldierWeaponRangeByID: function(soldierID)
		{
			let weaponRange = 1;
			if(Soldiers.isSoldierRangedByID(soldierID))
			{
				let weaponKey = Soldiers.getSoldierWeaponKeyByID(soldierID);
				weaponRange = Equipment.getWeaponRangeByKey(weaponKey);
			}
			return weaponRange;
		},
		
		// can return null as an invalid value.
		getSoldierWeaponTypeByID: function(soldierID)
		{
			let weaponKey = Soldiers.getSoldierWeaponKeyByID(soldierID);
			if(!weaponKey) return null;
			let weaponType = Equipment.getWeaponTypeByKey(weaponKey);
			return weaponType;
		},
		
		getSoldierArmorBodyPartByID: function(soldierID, bodyPart)
		{
			// TODO:
			let totalArmor = 0;
			let equipmentKeys = Game.getIDObjectProperty("soldiers", soldierID, "equipment");
			
			for(let index = 0; index < equipmentKeys.length; index++)
			{
				let equipmentKey = equipmentKeys[index];
				let equipmentType = Equipment.getEquipmentTypeByKey(equipmentKey);
				if(equipmentType !== "armor") continue;
				
				let armor = Equipment.getEquipmentArmorByKey(equipmentKey);
				let armorCoverage = Equipment.getEquipmentArmorCoverageByKey(equipmentKey, bodyPart);
				let layerArmor = armor * armorCoverage / 100;
				totalArmor += layerArmor;
			}
			return totalArmor;
		},
		
		getSoldierTeamByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "team");
		},
		
		isSoldierDeadByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "isDead");
		},
		
		hasSoldierEquipmentByID: function(soldierID, equipmentKey)
		{
			let equipment = Game.getIDObjectProperty("soldiers", soldierID, "equipment");
			if(equipment.indexOf(equipmentKey) > -1)
			{
				return true;
			}
			return false;
		},
		
		getSoldierWeaponKeyByID: function(soldierID)
		{
			// get the first weapon. temp until redesign.
			let equipmentKeys = Game.getIDObjectProperty("soldiers", soldierID, "equipment");
			for(let index = 0; index < equipmentKeys.length; index++)
			{
				let equipmentKey = equipmentKeys[index];
				if(Equipment.getEquipmentTypeByKey(equipmentKey) === "weapon")
				{
					return equipmentKey;
				}
			}
		},
		
		getSoldierMountKeyByID: function(soldierID)
		{
			// ditto except for mounts
			let equipmentKeys = Game.getIDObjectProperty("soldiers", soldierID, "equipment");
			for(let index = 0; index < equipmentKeys.length; index++)
			{
				let equipmentKey = equipmentKeys[index];
				if(Equipment.getEquipmentTypeByKey(equipmentKey) === "mount")
				{
					return equipmentKey;
				}
			}
		},
		
		getSoldierAttributesByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "attributes");
		},
		
		getSoldierSkillsByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "skills");
		},
		
		getSoldierAttribute: function(soldierID, attributeName)
		{
			let attributes = Game.getIDObjectProperty("soldiers", soldierID, "attributes");
			if(!attributes) 
			{
				console.warn(`Soldiers.getSoldierAttribute: cannot find attributes for "${soldierID}".`);
				return;
			}
			return attributes[attributeName];
		},
		
		getSoldierSkill: function(soldierID, skillName)
		{
			let skills = Game.getIDObjectProperty("soldiers", soldierID, "skills");
			if(!skills) 
			{
				console.warn(`Soldiers.getSoldierSkill: cannot find skills for "${soldierID}".`);
				return;
			}
			return skills[skillName];
		},
		
		/* Setters */
		
		changeSoldierAttribute: function(soldierID, attributeName, value)
		{
			// TODO: probably shouldn't change this directly
			let attributes = Game.getIDObjectProperty("soldiers", soldierID, "attributes");
			if(!attributes) 
			{
				console.warn(`Soldiers.changeSoldierAttribute: cannot find attributes for "${soldierID}".`);
				return;
			}
			attributes[attributeName] += value;
		},
		
		changeSoldierSkill: function(soldierID, skillName, value = 0)
		{
			// TODO: probably shouldn't change this directly
			let skills = Game.getIDObjectProperty("soldiers", soldierID, "skills");
			if(!skills) 
			{
				console.warn(`Soldiers.getSoldierSkill: cannot find skills for "${soldierID}".`);
				return;
			}
			skills[skillName] += value;
		},
		
		addSoldierSkillXP: function(soldierID, skillName, value)
		{
			// TODO: temp 
			if(Math.random() < (1/4))
			{
				Soldiers.changeSoldierSkill(soldierID, skillName, 1);
			}
		},
		
		// add without dealing with player equipment stocks
		addSoldierEquipment: function(soldierID, equipmentKey)
		{
			if(Soldiers.hasSoldierEquipmentByID(soldierID, equipmentKey))
			{
				// cannot add equipment if it is already there 
				return false;
			}
			
			// TODO: deal with 'slots'
			
			let equipment = Game.getIDObjectProperty("soldiers", soldierID, "equipment");
			equipment.push(equipmentKey);
			return true;
		},
		
		// checks if the player has enough equipment first before equiping
		equipSoldierByID: function(soldierID, equipmentKey)
		{
			let equipmentCount = Equipment.getEquipmentCountByKey(equipmentKey);
			
			if(!(equipmentCount > 0))
			{
				return;
			}
			
			if(Soldiers.addSoldierEquipment(soldierID, equipmentKey))
			{
				Soldiers.removeEquipmentCountByKey(equipmentKey, 1);
			}
		},
		
		damageSoldier: function(soldierID, damageAmount, sourceID)
		{
			// no negative damage allowed, use .healSoldier instead
			if(!(damageAmount > 0))
			{
				console.warn(`Soldiers.damageSoldier: invalid amount "${damageAmount}".`);
				return;
			}
			
			let HP = Soldiers.getSoldierHPByID(soldierID);
			let newHP = HP - damageAmount;
			Game.setIDObjectProperty("soldiers", soldierID, "HP", newHP);
			
			if(newHP <= 0)
			{
				Soldiers.killSoldier(soldierID, sourceID);
			}
			
			Soldiers.addSoldierMetric(soldierID, "totalDamageReceived", damageAmount);
			if(sourceID) Soldiers.addSoldierMetric(sourceID, "totalDamageDealt", damageAmount);
		},
		
		healSoldier: function(soldierID, healAmount)
		{
			// no negative healing allowed, use .damageSoldier instead
			if(!(healAmount > 0)) 
			{
				console.warn(`Soldiers.healSoldier: invalid amount "${healAmount}".`);
				return;
			}
			
			let HP = Soldiers.getSoldierHPByID(soldierID);
			let newHP = HP + healAmount;
			
			// cannot exceed maxHP
			let maxHP = Soldiers.getSoldierMaxHPByID(soldierID);
			if(newHP > maxHP) newHP = maxHP;
			
			Game.setIDObjectProperty("soldiers", soldierID, "HP", newHP);
			
			Soldiers.addSoldierMetric(soldierID, "totalDamageHealed", healAmount);
		},
		
		// used after a scenario to set HP back to max
		resetSoldierHP: function()
		{
			let maxHP = Soldiers.getSoldierMaxHPByID(soldierID);
			Game.setIDObjectProperty("soldiers", soldierID, "HP", maxHP);
		},
		
		changeSoldierFatigue: function(soldierID, value)
		{
			let oldValue = Soldiers.getSoldierFatigueByID(soldierID);
			let newValue = oldValue + value;
			if(newValue < 0) newValue = 0; // it's fine, likely end turn fatigue
			
			Game.setIDObjectProperty("soldiers", soldierID, "fatigue", newValue);
		},
		
		killSoldier: function(soldierID, killerID)
		{
			let pieceID = Soldiers.getSoldierFormationIDByID(soldierID);
			if(pieceID) Pieces.removeSoldierByID(pieceID, soldierID);
			
			Game.setIDObjectProperty("soldiers", soldierID, "isDead", true);
			if(killerID) Soldiers.addSoldierMetric(killerID, "totalKills", 1);
			// TODO: onkill
		},
		
		attackSoldier: function(attackerID, defenderID)
		{
			let attack = Soldiers.getSoldierAttackByID(attackerID);
			let defense = Soldiers.getSoldierDefenseByID(defenderID);
			
			let weaponMinMaxDamage = Soldiers.getSoldierWeaponMinMaxDamageByID(attackerID);
			
			let diceRoll = randomInteger(0, 99);
			let hitChance = BASE_HIT_CHANCE_PERCENT + attack - defense;
			let strengthDamageBonus = Math.floor(Soldiers.getSoldierAttribute(attackerID, ("strength")) / 5); // only in melee
			let weaponDamage = randomInteger(weaponMinMaxDamage.min, weaponMinMaxDamage.max);
			
			if(diceRoll < hitChance)
			{
				let bodyPartHit = randomWeightedKey(BODY_PARTS_HIT_CHANCE);
				let bodyPartDamageModifier = BODY_PARTS_DAMAGE_MODIFIER[bodyPartHit];
				let armor = Soldiers.getSoldierArmorBodyPartByID(defenderID, bodyPartHit);
				let damage = weaponDamage - armor;
				if(damage < 0)
				{
					// min damage must be 1.
					damage = MIN_DAMAGE;
				}
				damage = (damage) * bodyPartDamageModifier;
				GUI.addParticleAbovePiece("damage", damage, Soldiers.getSoldierFormationIDByID(defenderID));
				Soldiers.damageSoldier(defenderID, damage, attackerID);
			}
			
			// add some fatigue
			Soldiers.changeSoldierFatigue(attackerID, BASE_ATTACK_FATIGUE_COST);
			
			// add some XP
			let weaponType = Soldiers.getSoldierWeaponTypeByID(attackerID);
			if(weaponType) 
			{
				Soldiers.addSoldierSkillXP(attackerID, weaponType, 1);
			}
			
			
		},
		
		attackRangedSoldier: function(attackerID, defenderID)
		{
			let attack = Soldiers.getSoldierAttackByID(attackerID);
			let defense = Soldiers.getSoldierDefenseByID(defenderID);
			
			let weaponMinMaxDamage = Soldiers.getSoldierWeaponMinMaxDamageByID(attackerID);
			
			let diceRoll = randomInteger(0, 99);
			let hitChance = BASE_HIT_CHANCE_PERCENT + attack - defense;
			let weaponDamage = randomInteger(weaponMinMaxDamage.min, weaponMinMaxDamage.max);
			
			if(diceRoll < hitChance)
			{
				let bodyPartHit = randomWeightedKey(BODY_PARTS_HIT_CHANCE);
				let bodyPartDamageModifier = BODY_PARTS_DAMAGE_MODIFIER[bodyPartHit];
				let armor = Soldiers.getSoldierArmorBodyPartByID(defenderID, bodyPartHit);
				let damage = weaponDamage - armor;
				if(damage < 0)
				{
					// min damage must be 1.
					damage = MIN_DAMAGE;
				}
				damage = (damage) * bodyPartDamageModifier;
				GUI.addParticleAbovePiece("damage", damage, Soldiers.getSoldierFormationIDByID(defenderID));
				Soldiers.damageSoldier(defenderID, damage, attackerID);
			}
			
			// add some fatigue
			Soldiers.changeSoldierFatigue(attackerID, BASE_ATTACK_FATIGUE_COST);
			
			// add some XP
			let weaponType = Soldiers.getSoldierWeaponTypeByID(attackerID);
			if(weaponType) 
			{
				Soldiers.addSoldierSkillXP(attackerID, weaponType, 1);
			}
		},
		
		onSoldierEndTurn: function(soldierID)
		{
			// fatigue 
			Soldiers.changeSoldierFatigue(soldierID, -BASE_ENDTURN_FATIGUE);
		},
		
		/* Metrics */
		addSoldierMetric: function(soldierID, metricName, value)
		{
			if(!soldierID)
			{
				console.warn(`Soldiers.addSoldierMetric: invalid pieceID ${pieceID}`);
				return;
			}
			if(!value && value !== 0)
			{
				console.warn(`Soldiers.addPieceMetric: invalid value ${value}`);
				return;
			}
			
			let oldValue = Game.getIDObjectProperty("soldiers", soldierID, metricName);
			if(oldValue === undefined)
			{
				console.warn(`Soldiers.addSoldierMetric: cannot find value ${metricName}.`);
				return;
			}
			
			let newValue = oldValue + value;
			Game.setIDObjectProperty("soldiers", soldierID, metricName, newValue);
			
			// adapter for aggregating data
			let team = Soldiers.getSoldierTeamByID(soldierID);
			if(team === 1)
			{
				if(metricName === "totalKills")
				{
					Metrics.addMetric("formations_killed", value);
				}
				if(metricName === "totalDamageDealt")
				{
					Metrics.addMetric("damage_dealt", value);
				}
				if(metricName === "totalDamageReceived")
				{
					Metrics.addMetric("damage_received", value);
				}
				if(metricName === "totalDamageHealed")
				{
					Metrics.addMetric("health_healed", value);
				}
				if(metricName === "totalTilesMoved")
				{
					Metrics.addMetric("tiles_moved", value);
				}
			}
		},
		
		/* GUI */
		getUnitDesignerEquipment: function()
		{
			return unitDesignerEquipment;
		},
		
		addUnitDesignerEquipment: function(equipmentKey)
		{
			// temp while we're working on slots
			// don't repeat.
			if(unitDesignerEquipment.indexOf(equipmentKey) < 0)
			{
				unitDesignerEquipment.push(equipmentKey);
				GUI.updateUnitDesigner();
			}
		},
		
		removeUnitDesignerEquipment: function(equipmentKey)
		{
			removeElementInArray(unitDesignerEquipment, equipmentKey);
			GUI.updateUnitDesigner();
		},
		
		getUnitDesignerArmorCoverage: function()
		{
			return Soldiers.calculateTotalArmorByEquipmentList(Soldiers.getUnitDesignerEquipment());
		},
		/*
		getUnitDesignerStatistics: function()
		{
			return {
				
			}
		},
		 */
		// calculation functions 
		// factored out so they can be used in mock and live
		calculateTotalArmorByEquipmentList: function(equipmentList)
		{
			let calculatedTotalArmor = {};
			for(let coverageKey in BODY_PARTS_HIT_CHANCE)
			{
				calculatedTotalArmor[coverageKey] = 0;
			}
			for(let index = 0; index < equipmentList.length; index++)
			{
				let equipmentKey = equipmentList[index];
				let equipmentType = Equipment.getEquipmentTypeByKey(equipmentKey);
				
				if(equipmentType === "armor")
				{
					let equipmentArmor = Equipment.getEquipmentArmorByKey(equipmentKey);
					
					for(let coverageKey in BODY_PARTS_HIT_CHANCE)
					{
						let coverageRatio = Equipment.getEquipmentArmorCoverageByKey(equipmentKey, coverageKey) / 100;
						let partArmor = coverageRatio * equipmentArmor;
						calculatedTotalArmor[coverageKey] += partArmor;
					}
				}
			}
			return calculatedTotalArmor;
		},
		
		calculateTotalWeightByEquipmentList: function(equipmentList)
		{
			let totalWeight = 0;
			for(let index = 0; index < equipmentList.length; index++)
			{
				let equipmentKey = equipmentList[index];
				let equipmentWeight = Equipment.getEquipmentWeightByKey(equipmentKey);
				if(equipmentWeight) totalWeight += equipmentWeight;
			}
			return totalWeight;
		},
		
	}
})();

var NameGenerator = (function()
{
	var humanMaleNames = ["James", "Robert", "John", "Michael", "David", "William", "Richard", "Joseph", "Thomas", "Charles"];
	var humanFemaleNames = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen"];
	var humanNames = humanMaleNames.concat(humanFemaleNames);
	
	return {
		// returns ONE name. last names are for nobles.
		generateHumanName: function()
		{
			return randomElementInArray(humanNames);
		},
		
		generateHumanMaleName: function()
		{
			return randomElementInArray(humanMaleNames);
		},
		
		generateHumanFemaleName: function()
		{
			return randomElementInArray(humanFemaleNames);
		},
	}
})();