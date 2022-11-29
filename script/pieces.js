/*
	"...the pieces are moving..."
	
	Like chess, a piece that can move and attack.
		
		
	// perhaps we could outsource a few stats to weapons.
	ie: 
		"doppelsodner": {
			"weapon": "greatsword"
			"melee": 35,
			"defense": 20,
			"ranged": 0,
		}
		
		"greatsword": {
			"damage": 7,
			"type": slash,
		}
	
	
	TODO:
		Add promotions (0.2.x);

		// kill all the dead pieces which have no meaningful connection.
		Pieces.prune();
		// undeploy every unit for when that is needed.
		Pieces.undeployAll();
		
		Separate AP into movement points and AP
				
		High contrast colour scheme for units...
		
		Change HP to FGII system: Total/Wounded/Dead.
		
		Flanking in melee 
		Archers
 */
var Pieces = (function()
{
	const BASE_HIT_CHANCE_PERCENT = 35; 
	const BASE_XP_PER_MOVE = 5; // how much a basic attack or defense will give in XP
	
	/*
		Design Philosophy:
			A generic unit at parity should die to 5 direct hits.
			We take it extrapolating from several data points:
				-In wesnoth, 2-3 hits at parity are a kill.
				-A 1-hit kill is a glass cannon.
				-20 hits to kill is far too thick.
	 */
	var piecesStatistics = 
	{
		"spearman": {
			"typeName": "spearman",
			"name": "Spearman",
			"image": "spearman",
			"drawSettings": 
			{
				// not its actual width or height, 
				// but the DISPLAY width and height for formations
				"width": 6,
				"height": 6,
				"rowWidth": 4,
				"rowOddX": 1,
				"marginX": 4,
				"marginY": 3,
			},
			"HP": 50*12,
			"AP": 3,
			"attack": 20,
			"defense": 15,
			"damage": 8,
			"armor": 0,
			"onKillXP": 50,
			"formationCount": 12,
			
			"buyable": true,
			"buyablePriceGold": 50,
			"buyablePriceManpower": 12,
		},
		
		"pikeman": {
			"typeName": "pikeman",
			"name": "Pikeman",
			"image": "pikeman",
			"drawSettings": 
			{
				// not its actual width or height, 
				// but the DISPLAY width and height for formations
				"width": 6,
				"height": 6,
				"rowWidth": 4,
				"rowOddX": 1,
				"marginX": 3,
				"marginY": 3,
			},
			"HP": 50*12,
			"AP": 3,
			"attack": 25,
			"defense": 25,
			"damage": 12,
			"armor": 4,
			"onKillXP": 100,
			"formationCount": 12,
		},
		
		"swordsman": {
			"typeName": "swordsman",
			"name": "Swordsman",
			"image": "swordsman",
			"drawSettings": 
			{
				// not its actual width or height, 
				// but the DISPLAY width and height for formations
				"width": 6,
				"height": 6,
				"rowWidth": 4,
				"rowOddX": 1,
				"marginX": 3,
				"marginY": 3,
			},
			"HP": 50*12,
			"AP": 3,
			"attack": 24,
			"defense": 20,
			"damage": 10,
			"armor": 1,
			"onKillXP": 50,
			"formationCount": 12,
			
			"buyable": true,
			"buyablePriceGold": 75,
			"buyablePriceManpower": 12,
		},
		
		"horseman": {
			"typeName": "horseman",
			"name": "Horseman",
			"image": "horseman",
			"drawSettings": 
			{
				// not its actual width or height, 
				// but the DISPLAY width and height for formations
				"width": 6,
				"height": 4,
				"rowWidth": 1,
				"rowOddX": 6,
				"marginX": 1,
				"marginY": 1,
			},
			"HP": 100*3,
			"AP": 5,
			"attack": 30,
			"defense": 8,
			"damage": 15,
			"armor": 2,
			"onKillXP": 50,
			"formationCount": 3,
			
			"buyable": true,
			"buyablePriceGold": 100,
			"buyablePriceManpower": 3,
		},
		
		"undead_spearman": {
			"typeName": "undead_spearman",
			"name": "Undead Spearman",
			"image": "undead_spearman",
			"drawSettings": 
			{
				// not its actual width or height, 
				// but the DISPLAY width and height for formations
				"width": 6,
				"height": 6,
				"rowWidth": 4,
				"rowOddX": 1,
				"marginX": 4,
				"marginY": 3,
			},
			"HP": 25*12,
			"AP": 2,
			"attack": 18,
			"defense": 12,
			"damage": 7,
			"armor": 0,
			"onKillXP": 25,
			"formationCount": 12,
		},
	};
	
	// fields
	var selectedPieceID = null;
	var selectedBuyableName = null;
	
	return {
		initialize: function()
		{
			
		},
		
		newGame: function()
		{
			let createGenericSpearman = () => {return Pieces.createPiece("spearman",1)};
			let createGenericSwordsman = () => {return Pieces.createPiece("swordsman",1)};
			let createGenericHorseman = () => {return Pieces.createPiece("horseman",1)};
			let createPikeman = () => {return Pieces.createPiece("pikeman",1)};
			
			let createEnemySpearman = () => {return Pieces.createPiece("undead_spearman",2)};
			
			// TESTING
			Game.createNewIDObject("pieces", createGenericSpearman);
			Pieces.movePieceByID(1001, Board.calculateIndexFromCartesian(1,1));
			Game.createNewIDObject("pieces", createGenericSpearman);
			Pieces.movePieceByID(1002, Board.calculateIndexFromCartesian(2,2));
			Game.createNewIDObject("pieces", createGenericSpearman);
			Pieces.movePieceByID(1003, Board.calculateIndexFromCartesian(1,3));
			
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(1004, Board.calculateIndexFromCartesian(10,1));
			Pieces.movePieceByID(1004, Board.calculateIndexFromCartesian(4,2));
			
			Game.createNewIDObject("pieces", createGenericSwordsman);
			Pieces.movePieceByID(1005, Board.calculateIndexFromCartesian(2,3));
			
			Game.createNewIDObject("pieces", createGenericHorseman);
			Pieces.movePieceByID(1006, Board.calculateIndexFromCartesian(2,4));
			
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(1007, Board.calculateIndexFromCartesian(4,3));
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(1008, Board.calculateIndexFromCartesian(4,4));
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(1009, Board.calculateIndexFromCartesian(4,5));
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(1010, Board.calculateIndexFromCartesian(4,6));
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(1011, Board.calculateIndexFromCartesian(6,3));
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(1012, Board.calculateIndexFromCartesian(5,4));
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(1013, Board.calculateIndexFromCartesian(6,4));
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(1014, Board.calculateIndexFromCartesian(6,6));
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(1015, Board.calculateIndexFromCartesian(6,7));
			
			Game.createNewIDObject("pieces", createGenericSpearman);
			Pieces.movePieceByID(1016, Board.calculateIndexFromCartesian(0,0));
			
			Game.createNewIDObject("pieces", createPikeman);
			Pieces.movePieceByID(1017, Board.calculateIndexFromCartesian(0,1));
			
			
			Abilities.abilityMovePiece(1002, Board.calculateIndexFromCartesian(3,2));
			Abilities.abilityMeleeAttackPiece(1002, 1004);
			Abilities.abilityMeleeAttackPiece(1002, 1004);
			Abilities.abilityMeleeAttackPiece(1002, 1004);
			Abilities.abilityMeleeAttackPiece(1004, 1002);
			Abilities.abilityMeleeAttackPiece(1004, 1002);
			Abilities.abilityMeleeAttackPiece(1004, 1002);
			Abilities.abilityMeleeAttackPiece(1004, 1002);
			
			Pieces.addXP(1003,1000);
			Pieces.damagePiece(1001,500);
		},
		
		/*
			Creates a new piece.
			NOTE: do not create it directly from here. This is a factory function.
			Use Game.createNewIDObject instead!
			
			Note that the factory pattern is highly extensible.
			For example, in its parent function, we can do something like:
				createHalfdeadSpearman = () => {
					let piece = createPiece("spearman");
					piece.HP = piece.maxHP/2;
				}
		 */
		createPiece: function(typeName = "spearman", team = 1)
		{
			let type = piecesStatistics[typeName];
			let piece = {};
			// the piece has not been placed anywhere yet and so it is null
			piece.position = null;
			piece.typeName = typeName;
			piece.HP = type.HP;
			piece.AP = type.AP;
			piece.XP = 0;
			piece.isDead = false;
			piece.killedByID = null;
			piece.team = team;
			piece.traits = [];
			// metrics
			piece.totalKills = 0;
			piece.totalDamageDealt = 0;
			piece.totalDamageReceived = 0;
			piece.totalDamageHealed = 0;
			piece.totalTilesMoved = 0;
			return piece;
		},
		
		getPiece: function(pieceID)
		{
			return Game.getIDObject("pieces",pieceID);
		},
		
		getPieces: function()
		{
			return Game.getState("pieces");
		},
		
		getLivingPiecesID: function()
		{
			// TODO: eventually change .map to something more efficient
			let livingPiecesID = (Pieces.getLivingPieces()).map(piece => {return piece.ID});
			return livingPiecesID;
		},
		
		getLivingPieces: function()
		{
			// TODO: eventually change .filter to something more efficient
			let pieces = Game.getState("pieces");
			let livingPieces = pieces.filter(piece => {return !piece.isDead});
			return livingPieces;
		},
		
		getTeamPiecesID: function(team)
		{
			let pieces = Game.getState("pieces");
			let livingPieces = pieces.filter(piece => {return (!piece.isDead) && piece.team === team});
			let livingPiecesID = (livingPieces).map(piece => {return piece.ID});
			return livingPiecesID;
		},
		
		getPieceImageByID: function(pieceID)
		{
			var piece = Pieces.getPiece(pieceID);
			return Pieces.getPieceImageByObject(piece);
		},
		
		getPieceImageByObject: function(piece)
		{
			let imageName = piecesStatistics[piece?.typeName]?.image;
			let image = Assets.getImage(imageName);
			return image;
		},
		
		// returns in index form, beware
		getPiecePositionByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces",pieceID,"position");
		},
		// in future, any bonuses will be applied in these functions, 
		// and that is why we have to write an additional function
		getPieceAttackByID: function(pieceID)
		{
			let baseAttack = Pieces.getPieceTypePropertyByID(pieceID, "attack");
			
			// level increase
			let level = Pieces.getPieceLevelByID(pieceID);
			let levelBonus = level;
			
			let attack = baseAttack + levelBonus;
			
			return attack;
		},
		
		getPieceDefenseByID: function(pieceID)
		{
			let baseDefense = Pieces.getPieceTypePropertyByID(pieceID, "defense");
			
			let level = Pieces.getPieceLevelByID(pieceID);
			let levelBonus = level;
			
			let defense = baseDefense + levelBonus;
			
			return defense;
		},
		
		getPieceAttackDamageByID: function(pieceID)
		{
			let baseDamage = Pieces.getPieceTypePropertyByID(pieceID, "damage");
			
			let damage = baseDamage;
			
			return damage;
		},
		
		getPieceArmorByID: function(pieceID)
		{
			let baseArmor = Pieces.getPieceTypePropertyByID(pieceID, "armor");
			
			let armor = baseArmor;
			
			return armor;
		},
		
		getPieceHPByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces", pieceID, "HP");
		},
		
		getPieceMaxHPByID: function(pieceID)
		{
			let baseMaxHP = Pieces.getPieceTypePropertyByID(pieceID, "HP");
			
			return baseMaxHP;
		},
		
		getPieceAPByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces", pieceID, "AP");
		},
		
		getPieceMaxAPByID: function(pieceID)
		{
			let baseMaxAP = Pieces.getPieceTypePropertyByID(pieceID, "AP");
			
			return baseMaxAP;
		},
		
		getPieceMovementRangeByID: function(pieceID)
		{
			return Pieces.getPieceAPByID(pieceID);
		},
		
		getPieceXPByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces", pieceID, "XP");
		},
		
		// XP formula: 100, 150, 200, 250, 300
		// >, >>, >>>, |>>>, STAR
		getPieceLevelByID: function(pieceID)
		{
			let XP = Pieces.getPieceXPByID(pieceID);
			
			// TODO: factor this out into its own function calculateLevelFromXP
			let level = 0;
			// naive, but hey, it works.
			if(XP >  50) {XP -=  50; level++;}
			if(XP > 100) {XP -= 100; level++;}
			if(XP > 150) {XP -= 150; level++;}
			if(XP > 200) {XP -= 200; level++;}
			if(XP > 250) {XP -= 250; level++;}
			if(XP > 300) {XP -= 300; level++;}
			if(XP > 350) {XP -= 350; level++;}
			if(XP > 400) {XP -= 400; level++;}
			if(XP > 450) {XP -= 450; level++;}
			if(XP > 500) {XP -= 500; level++;}
			
			return level;
		},
		
		getPieceOnKillXPByID: function(pieceID)
		{
			let baseXP = Pieces.getPieceTypePropertyByID(pieceID, "onKillXP");
			// level multiplier
			let level = Pieces.getPieceLevelByID(pieceID);
			
			let killXP = (level + 1) * baseXP;
			return killXP;
		},
		
		getPieceTeamByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces", pieceID, "team");
		},
		
		isPieceDeadByID: function(pieceID)
		{
			let piece = Pieces.getPiece(pieceID);
			return piece?.isDead;
		},
		
		getPieceSoldierCountByID: function(pieceID)
		{
			let HPRatio = Pieces.getPieceHPByID(pieceID) / Pieces.getPieceMaxHPByID(pieceID);
			let spriteCount = Pieces.getPieceTypePropertyByID(pieceID, "formationCount") * HPRatio;
			// a half dead person is still alive.
			spriteCount = Math.ceil(spriteCount);
			return spriteCount;
		},
		
		/*
			A generalized series of functions for looking up the property of a specific object by name.
				null tolerant, and DOES NOT warn you if the property is valid or missing; 
				care must be taking at the other end for seeing if the property given is valid.
			
			If the return is "null", that's a VALID value. "undefined" is the error code you're looking for.
		 */
		getPieceTypePropertyByID: function(pieceID, propertyName)
		{
			let piece = Pieces.getPiece(pieceID);
			return Pieces.getPieceTypePropertyByObject(piece, propertyName);
		},
		
		getPieceTypePropertyByObject: function(piece, propertyName)
		{
			let typeName = piece?.typeName;
			return Pieces.getPieceTypePropertyByName(typeName, propertyName);
		},
		
		getPieceTypePropertyByName: function(typeName, propertyName)
		{
			let type = piecesStatistics[typeName];
			if(!type) return;
			return type[propertyName];
		},
		
		getBuyablePieces: function()
		{
			let buyablePieces = [];
			
			let type;
			for(let typeName in piecesStatistics)
			{
				type = piecesStatistics[typeName];
				
				if(type.buyable)
				{
					buyablePieces.push(type);
				}
			}
			
			return buyablePieces;
		},
		
		movePieceByID: function(pieceID, newPosition)
		{
			// check if new position is occupied
			if(Board.isTilePieceOccupiedIndex(newPosition))
			{
				console.warn(`Pieces.movePieceByID: cannot move piece "${pieceID}" newPosition "${newPosition}" is already occupied!`);
				return;
			}
			
			let oldPosition = Game.getIDObjectProperty("pieces",pieceID,"position");
			// sometimes oldPosition is intentionally null, in which case, forget it.
			if(Board.isValidIndex(oldPosition))
			{
				Board.setTilePieceOccupiedIndex(oldPosition, null);
			}
			Game.setIDObjectProperty("pieces",pieceID,"position",newPosition);
			Board.setTilePieceOccupiedIndex(newPosition, pieceID);
			
			// set update flag because of a significant change
			GUI.updateUnits();
		},
		
		/**
			a more sophisticated algorithm which ensures that there is a valid path to the destination.
			more expensive, and mostly used in conjucation with the ability move
		 */
		movePieceWithPathfindingByID: function(pieceID, destinationPosition, range)
		{
			let originPosition = Pieces.getPiecePositionByID(pieceID);
			// obviously forget it if we're not moving.
			if(originPosition === destinationPosition) return;
			// first check if destination tile is valid 
			if(!Board.isTileValidDestinationByIndex(destinationPosition))
			{
				return;
			}
			let distance = Board.calculatePathfindingDistanceByIndex(originPosition, destinationPosition);
			if(distance === undefined)
			{
				// obviously invalid, so we do nothing. 
				return;
			}
			if(range < distance)
			{
				// if we have not enough AP, also do nothing.
				return;
			}
			// everything being valid, now we move.
			Pieces.movePieceByID(pieceID, destinationPosition);
			// now get our pathfinding distance 
			Pieces.addPieceMetric(pieceID, "totalTilesMoved", distance); // assuming tilecost is always 1, this holds for now.
			// return distance for AP cost. NOTE: this distance is not *exactly* equal.
			return distance;
		},
		
		damagePiece: function(pieceID, damageAmount, sourceID)
		{
			// no negative damage allowed.
			if(!(damageAmount > 0)) 
			{
				console.warn(`Pieces.damagePiece: invalid amount "${damageAmount}".`);
				return;
			}
			let HP = Pieces.getPieceHPByID(pieceID);
			let newHP = HP - damageAmount;
			if(newHP <= 0) 
			{
				Pieces.killPiece(pieceID, sourceID);
			}
			
			Game.setIDObjectProperty("pieces",pieceID,"HP",newHP);
			
			// set update flag because of a significant change
			GUI.updateUnits();
			
			Pieces.addPieceMetric(pieceID, "totalDamageReceived", damageAmount);
			if(sourceID) Pieces.addPieceMetric(sourceID, "totalDamageDealt", damageAmount);
		},
		
		healPiece: function(pieceID, healAmount)
		{
			// no negative healing allowed.
			if(!(healAmount > 0)) 
			{
				console.warn(`Pieces.healPiece: invalid amount "${healAmount}".`);
				return;
			}
			
			let HP = Pieces.getPieceHPByID(pieceID);
			let newHP = HP + healAmount;
			
			// cannot exceed maxHP
			let maxHP = Pieces.getPieceMaxHPByID(pieceID);
			if(newHP > maxHP) newHP = maxHP;
			
			Game.setIDObjectProperty("pieces",pieceID,"HP",newHP);
			
			// set update flag because of a significant change
			GUI.updateUnits();
			
			Pieces.addPieceMetric(pieceID, "totalDamageHealed", healAmount);
		},
		
		killPiece: function(pieceID, sourceID)
		{
			// housekeeping
			Game.setIDObjectProperty("pieces",pieceID,"isDead",true);
			let pieceTeam = Pieces.getPieceTeamByID(pieceID);
			if(pieceTeam === 1) Metrics.addMetric("formations_lost", 1);
			// free its position
			let position = Pieces.getPiecePositionByID(pieceID);
			Board.setTilePieceOccupiedIndex(position, null);
			
			// give XP to the killer (if it exists)
			let onKillXP = Pieces.getPieceOnKillXPByID(pieceID);
			if(sourceID) 
			{
				Pieces.addXP(sourceID, onKillXP);
				
				Pieces.addPieceMetric(sourceID, "totalKills", 1);
				Game.setIDObjectProperty("pieces", pieceID, "killedByID", sourceID);
			}
			// set update flag because of a significant change
			GUI.updateUnits();
		},
		
		addXP: function(pieceID, value)
		{
			if(!(value > 0)) 
			{
				console.warn(`Pieces.addXP: invalid amount "${value}".`);
				return;
			}
			
			let XP = Game.getIDObjectProperty("pieces",pieceID,"XP");
			let newXP = XP + value;
			// TODO: onLevelUp
			Game.setIDObjectProperty("pieces",pieceID,"XP",newXP);
			
			// set update flag because of a significant change
			GUI.updateUnits();
			// register metrics
			let team = Pieces.getPieceTeamByID(pieceID);
			if(team === 1) Metrics.addMetric("xp_earned", value);
		},
		
		fullHealPiece: function(pieceID)
		{
			let maxHP = Pieces.getPieceMaxHPByID(pieceID);
			Game.setIDObjectProperty("pieces", pieceID, "HP", maxHP);
			// we do NOT register full heal metrics because no healing ability is going to use full heal. This is used SOLELY at the end of a scenario to reset HP. It should probably be renamed accordingly.
			
			// set update flag because of a significant change
			GUI.updateUnits();
		},
		
		attackPiece: function(attackerID, defenderID)
		{
			let soldierCount = Pieces.getPieceSoldierCountByID(attackerID);
			
			// get attack and defense
			let attack = Pieces.getPieceAttackByID(attackerID);
			let defense = Pieces.getPieceDefenseByID(defenderID);
			let weaponDamage = Pieces.getPieceAttackDamageByID(attackerID);
			let armor = Pieces.getPieceArmorByID(defenderID);

			for(var soldierIndex = 0; soldierIndex < soldierCount; soldierIndex++)
			{
				let diceRoll = randomInteger(0,99);
				let hitchance = BASE_HIT_CHANCE_PERCENT + attack - defense;
				
				if(diceRoll < hitchance)
				{
					
					let damage = weaponDamage - armor; 
					// don't worry, negative values are handled already.
					Pieces.damagePiece(defenderID, damage, attackerID);
					// add particle effect
					GUI.addParticleAbovePiece("damage", damage, defenderID);
				}
			}
			
			// add some XP for the attack itself.
			// add some XP for the defender as well.
			Pieces.addXP(attackerID, BASE_XP_PER_MOVE);
			Pieces.addXP(defenderID, BASE_XP_PER_MOVE);
		},
		
		spendPieceAP: function(pieceID, amount)
		{
			let AP = Pieces.getPieceAPByID(pieceID);
			let newAP = AP - amount;
			
			if(newAP < 0)
			{
				console.warn(`Pieces.spendAP: newAP "${newAP}" is less than 0.`);
				newAP = 0;
				return false;
			}
			
			return Game.setIDObjectProperty("pieces", pieceID, "AP", newAP);
		},
		
		// centralize it here for better metric management.
		addPieceMetric: function(pieceID, metricName, value)
		{
			if(!pieceID) // 0 cannot possibly be a valid pieceID.
			{
				console.warn(`Pieces.addPieceMetric: invalid pieceID ${pieceID}`);
			}
			if(!value && value !== 0)
			{
				console.warn(`Pieces.addPieceMetric: invalid value ${value}`);
			}
			let oldValue = Game.getIDObjectProperty("pieces",pieceID,metricName);
			if(oldValue === undefined)
			{
				console.warn(`Pieces.addPieceMetric: cannot find value ${metricName}.`);
				return;
			}
			let newValue = oldValue + value;
			Game.setIDObjectProperty("pieces",pieceID,metricName,newValue);
			
			let team = Pieces.getPieceTeamByID(pieceID);
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
		
		// helper function to mark all the blue tiles for valid movement
		getValidMovementMap: function(pieceID)
		{
			let piecePosition = Pieces.getPiecePositionByID(pieceID);
			if(!piecePosition && piecePosition !== 0) return;

			let range = Pieces.getPieceMovementRangeByID(pieceID);
			// if no range, do nothing 
			if(!range) return;
			
			let movementMap = Board.calculateTilePathfindingDistanceMapByIndex(piecePosition, range);
			// delete the 0,origin position
			delete movementMap[piecePosition];
			return movementMap;
		},
		
		// helper function to mark all the red tiles for valid attacks.
		// range is for ranged abilities only, not movement.
		getValidTargets: function(attackerID, range = 1, type = "attack")
		{
			var livingPieces = Pieces.getLivingPieces();
			var attackerPosition = Pieces.getPiecePositionByID(attackerID);
			var attackerTeam = Pieces.getPieceTeamByID(attackerID);
			var validTargets = [];
			
			for(var index = 0; index < livingPieces.length; index++)
			{
				var piece = livingPieces[index];
				// ignore if the piece is also the attacker... you CAN'T attack yourself!
				if(piece.ID === attackerID) continue;
				// also ignore if piece is on the same side!
				if(piece.team === attackerTeam) continue;
				
				var piecePosition = piece.position;
				
				// we go for by bird's eye view in case of ranged attacks
				var distance = Board.calculateDistanceToTileByIndex(attackerPosition, piecePosition);
				if(distance <= range) validTargets.push(piece);
			}
			
			return validTargets;
		},
		
		getValidTargetsID: function(attackerID, range = 1, type = "attack")
		{
			var validTargets = Pieces.getValidTargets(attackerID, range, type);
			// TODO: change map to something else
			var validTargetsID = validTargets.map( (target) => { return target.ID } );
			return validTargetsID;
		},
		
		getValidSpawnPositions: function(team = 1)
		{
			let validPositions = [];
			
			let x = 0;
			if(team === 1)
			{
				x = 0;
			}
			else if(team === 2)
			{
				x = Board.getMapWidth() - 1;
			}
			let minY = 0;
			let maxY = Board.getMapHeight() - 1;
			
			for(let y = 0; y <= maxY; y++)
			{
				let tileIndex = Board.calculateIndexFromCartesian(x,y);
				
				if(!Board.isTilePieceOccupiedIndex(tileIndex))
				{
					validPositions.push(tileIndex);
				}
			}
			
			return validPositions;
		},
		
		/* Buying */
		buyAndSpawnPiece: function(typeName, position)
		{
			// first, see if tilePosition is valid. it pays to be paranoid, especially since this is UI facing.
			if(!Board.isTileValidDestinationByIndex(position))
			{
				console.warn(`Pieces.buyAndSpawnPiece: position "${position}" already occupied!`);
				return;
			}
			// double check that typeName exists 
			if(!piecesStatistics[typeName]) 
			{
				console.warn(`Pieces.buyAndSpawnPiece: typeName "${typeName}" not found.`);
				return;
			}
			// TODO: check and deduct money here.
			
			// now, create and spawn.
			let createPiece = () => { return Pieces.createPiece(typeName,1) };
			
			Game.createNewIDObject("pieces", createPiece);
			Pieces.movePieceByID(Game.getState("ID","pieces"), position);
			
			// this should ONLY be used by the player, so we can always add it as a metric.
			// TODO: add metric for money
		},
		
		/*
			GUI and UI related
		 */
		getSelectedPiece: function()
		{
			return selectedPieceID;
		},			
		 
		selectPiece: function(pieceID)
		{
			// cannot select dead pieces 
			if(Pieces.isPieceDeadByID(pieceID)) return;
			Pieces.deselectBuyPiece();
			selectedPieceID = pieceID;
			GUI.updateUI();
		},
		
		deselectPiece: function()
		{
			selectedPieceID = null;
			GUI.updateUI();
		},
		
		getSelectedBuyPiece: function()
		{
			return selectedBuyableName;
		},
		
		setSelectedBuyPiece: function(name)
		{
			Pieces.deselectAllSelected();
			selectedBuyableName = name;
			GUI.updateUI();
		},
		
		deselectBuyPiece: function()
		{
			selectedBuyableName = null;
			GUI.updateUI();
		},
		
		deselectAllSelected: function()
		{
			Pieces.deselectPiece();
			Pieces.deselectBuyPiece();
			Abilities.deselectAbility();
		},
		
		/*
			Spawning
		 */
		
		// spawn randomly on the left
		spawnAlly: function()
		{
			// find unoccupied tile location 
			var mapWidth = Board.getMapWidth();
			var mapHeight = Board.getMapHeight();
			
			// naive, if we don't find a tile on first path, then do nothing.
			let x = 0;
			let y = randomInteger(0, mapHeight - 1);
			
			let index = Board.calculateIndexFromCartesian(x,y);
			if(Board.isTilePieceOccupiedIndex(index)) return;
			
			let createAlly = () => 
				{
					let types = ["spearman","pikeman","swordsman","horseman"];
					return Pieces.createPiece(randomElementInArray(types),1)
				};
			Game.createNewIDObject("pieces", createAlly);
			Pieces.movePieceByID(Game.getState("ID","pieces"), index);
		},
		 
		// spawn randomly on the right
		spawnEnemy: function()
		{
			// find unoccupied tile location 
			var mapWidth = Board.getMapWidth();
			var mapHeight = Board.getMapHeight();
			
			// naive, if we don't find a tile on first path, then do nothing.
			let x = mapWidth - 1;
			let y = randomInteger(0, mapHeight - 1);
			
			let index = Board.calculateIndexFromCartesian(x,y);
			if(Board.isTilePieceOccupiedIndex(index)) return;
			
			let createEnemySpearman = () => {return Pieces.createPiece("undead_spearman",2)};
			Game.createNewIDObject("pieces", createEnemySpearman);
			Pieces.movePieceByID(Game.getState("ID","pieces"), index);
		},
		
		/* 
			End Turn
		 */	
		endTurn: function()
		{
			// go through every piece which is alive and restore AP.
			let alivePieces = Pieces.getLivingPiecesID();
			for(var index = 0; index < alivePieces.length; index++)
			{
				let pieceID = alivePieces[index];
				let maxAP = Pieces.getPieceMaxAPByID(pieceID);
				Game.setIDObjectProperty("pieces", pieceID, "AP", maxAP);
			}
			
			// set update flag because of a significant change
			GUI.updateUnits();
			GUI.updateUI();
			
			Metrics.addMetric("turns_played",1);
		},
		
		// TODO: perhaps we shall factor AI as its own thing someday.
		AITurn: function(team)
		{
			// really dumb AI. for now, just move left, 
			// and if you can't move left, then attack something close 
			// and if you can't attack something close, well tough luck.
			var teamPiecesID = Pieces.getTeamPiecesID(team);
			
			for(var pieceIndex = 0; pieceIndex < teamPiecesID.length; pieceIndex++)
			{
				let pieceID = teamPiecesID[pieceIndex];
				
				let movementMap = Pieces.getValidMovementMap(pieceID);
				// sort by leftmost
				let leftmostTile = null;
				let leftmostIndex;
				for(var tileIndex in movementMap)
				{
					let cartesian = Board.calculateCartesianFromIndex(tileIndex);
					if(!leftmostTile || leftmostTile?.x > cartesian.x)
					{
						// TEMP: condition for testing
						if(cartesian.x > 0)
						{
							leftmostTile = cartesian;
							leftmostIndex = tileIndex;
						}
					}
				}
				// in case there is no valid destination, do nothing.
				if(leftmostIndex)
				{
					Abilities.abilityMovePiece(pieceID, leftmostIndex);
				}
				// if we still have AP left
				let AP = Pieces.getPieceAPByID(pieceID);
				if(AP > 0)
				{
					// see if we can attack anything
					let attackTargetsID = Pieces.getValidTargetsID(pieceID, 1);
					let targetID = attackTargetsID[0];
					if(targetID)
					{
						Abilities.abilityMeleeAttackPiece(pieceID, targetID);
					}
				}
			}
		},
		
		// stress test
		TestOneHundredTurns: function()
		{
			for(index = 0; index < 100; index++)
			{
				let diceRoll = Math.random();
				let spawnChanceOne = 0.10;
				let spawnChanceTwo = 0.60;
				
				if(diceRoll < spawnChanceOne)
				{
					Pieces.spawnAlly();
				}
				
				if(diceRoll < spawnChanceTwo)
				{
					Pieces.spawnEnemy();
				}
				
				Pieces.AITurn(1);Pieces.AITurn(2);Pieces.endTurn();
			} 
		},
	}
})();