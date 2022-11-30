/*
	A soldier goes to war.
	They belong to a formation.
	
	Individual soldiers have no 'class', or template, as it is known.
	
	Design Philosophy:
		A generic unit at parity should die to 5 direct hits.
		We take it extrapolating from several data points:
			-In wesnoth, 2-3 hits at parity are a kill.
			-A 1-hit kill is a glass cannon.
			-20 hits to kill is far too thick.
			
	TODO: Auto-retreat. If a soldier's HP is below X, then they will move to reserves.
 */
var Soldiers = (function()
{
	const BASE_HIT_CHANCE_PERCENT = 35;
	
	var backstoriesStatistics = {
		
	}
	
	return {
		/*
			Object factories, generic and specific.
			NOTE: do not create it directly from here. This is a factory function.
			Use Game.createNewIDObject instead!
		 */
		 
		// generic template.
		createSoldier: function(team = 1)
		{
			let soldier = {};
			
			soldier.HP = 100;
			soldier.maxHP = 100;
			soldier.AP = 2;
			soldier.maxAP = 2; // todo: factor this out and move back to formations
			soldier.movement = 3;
			soldier.maxMovement = 3;
			soldier.fatigue = 0;
			
			// TEMP
			soldier.attack = 15;
			soldier.defense = 10;
			soldier.accuracy = 10;
			soldier.weaponDamage = 150;
			soldier.armor = 0;
			
			soldier.isDead = false;
			soldier.killedByID = null;
			soldier.team = team;
			
			soldier.formationID = null;
			soldier.isOfficer = false;
			soldier.officerID = null; // if soldier is an officer, additional stats here.
			
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
		
		getSoldierImageByID: function(soldierID)
		{
			// TODO: placeholder, to be replaced with dynamic sprites.
			let image = Assets.getImage("spearman");
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
		
		getSoldierAPByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "AP");
		},
		
		getSoldierMaxAPByID: function(soldierID)
		{
			let maxAP = Game.getIDObjectProperty("soldiers", soldierID, "maxAP");
			return maxAP;
		},
		
		getSoldierMovementByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "movement");
		},
		
		getSoldierMaxMovementByID: function(soldierID)
		{
			let maxMovement = Game.getIDObjectProperty("soldiers", soldierID, "maxMovement");
			return maxMovement;
		},
		
		getSoldierFatigueByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "fatigue");
		},
		
		getSoldierAttackByID: function(soldierID)
		{
			let attack = Game.getIDObjectProperty("soldiers", soldierID, "attack");
			return attack;
		},
		
		getSoldierDefenseByID: function(soldierID)
		{
			let defense = Game.getIDObjectProperty("soldiers", soldierID, "defense");
			return defense;
		},
		
		getSoldierAccuracyByID: function(soldierID)
		{
			let accuracy = Game.getIDObjectProperty("soldiers", soldierID, "accuracy");
			return accuracy;
		},
		
		getSoldierWeaponDamageByID: function(soldierID)
		{
			let weaponDamage = Game.getIDObjectProperty("soldiers", soldierID, "weaponDamage");
			return weaponDamage;
		},
		
		getSoldierWeaponRangeByID: function(soldier)
		{
			let weaponRange = 1;
			return weaponRange;
		},
		
		getSoldierArmorByID: function(soldierID)
		{
			let armor = Game.getIDObjectProperty("soldiers", soldierID, "armor");
			return armor;
		},
		
		getSoldierTeamByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "team");
		},
		
		isSoldierDeadByID: function(soldierID)
		{
			return Game.getIDObjectProperty("soldiers", soldierID, "isDead");
		},
		
		/* Setters */
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
			if(newHP <= 0)
			{
				Soldiers.killSoldier(soldierID, sourceID);
			}
			
			// TODO: damage particle effect
			
			Game.setIDObjectProperty("soldiers", soldierID, "HP", newHP);
			
			Soldiers.addSoldierMetric(soldierID, "totalDamageReceived", damageAmount);
			if(sourceID) Soldiers.addSoldierMetric(soldierID, "totalDamageDealt", damageAmount);
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
		
		killSoldier: function(soldierID, killerID)
		{
			// TODO: housekeeping for formations
			
			Game.setIDObjectProperty("soldiers", soldierID, "isDead", true);
			console.log(`Je suis mort! ${soldierID}`);
			// TODO: add metrics
			
			// TODO: onkill
		},
		
		attackSoldier: function(attackerID, defenderID)
		{
			let attack = Soldiers.getSoldierAttackByID(attackerID);
			let defense = Soldiers.getSoldierDefenseByID(defenderID);
			let weaponDamage = Soldiers.getSoldierWeaponDamageByID(attackerID);
			let armor = Soldiers.getSoldierArmorByID(defenderID);
			
			let diceRoll = randomInteger(0, 99);
			let hitChance = BASE_HIT_CHANCE_PERCENT + attack - defense;
			let damage = weaponDamage - armor; 
			
			if(diceRoll < hitChance)
			{
				Soldiers.damageSoldier(defenderID, damage, attackerID);
				// TODO: particle effect
			}
			
			// TODO: XP
		},
		
		// TODO: factor out
		spendSoldierMovement: function(soldierID, amount)
		{
			let movement = Soldiers.getSoldierMovementByID(soldierID);
			let newMovement = movement - amount;
			
			if(newMovement < 0)
			{
				console.warn(`Soldiers.spendSoldierMovement: newMovement "${newMovement}" is less than 0.`);
				newMovement = 0;
				return false;
			}
			
			return Game.setIDObjectProperty("soldiers", soldierID, "movement", newMovement);
		},
		
		onEndTurn: function()
		{
			// TODO: handle status effects
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
	}
})();

// TODO: SoldierLogMessage