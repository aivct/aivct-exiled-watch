/*
	"...the pieces are moving..."
	
	Like chess, a piece that can move and attack. 
	
	A piece shall compose of its individual soldiers.
	TODO: overhaul attack and defense to be something more like SOW:TNS.
			
	NOTE:
		Decompose:
		KillerID ->
			KillerType 
			KillerID
		
		uncullable: if the piece is a leader, unique, story, etc...
		a faceless mook is usually culled if it's dead (and sometimes even when alive!) after a battle, 
			but if it's killed someone important, then it gets to live on (and may become the player's greatest nemesis!)
			
		dynarow: if a unit is wounded, automatically exchange with a fresh unit to the back in melee combat.
		
		stamina:
			undead don't suffer from stamina problems, but are very weak.
			greenskins/wildlings are like celts, using a lot of stamina and then becoming weak
			human legions must manage stamina, but their tactics can conserve quite a bit of stamina.
	
	In later versions, a piece shall comprise of the soldiers/monsters drafted to fight.
	Its attack/defense function is also relegated to an aggregation of individual functions.
	This should really be renamed: formations.
		
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
		// Add promotions (0.2.x);

		// kill all the dead pieces which have no meaningful connection.
		Pieces.prune();
		// undeploy every unit for when that is needed.
		Pieces.undeployAll();
		
		Separate AP into movement points and AP
		High contrast colour scheme for units...
		Change HP to FGII system: Total/Wounded/Dead.
		
		Flanking in melee 
		Archers
	
	[0][1][2]|[2][1][0]
	[3][4][5]|[5][4][3]
	[6][7][8]|[8][7][6]
 */
var Pieces = (function()
{
	const BASE_HIT_CHANCE_PERCENT = 35; 
	const BASE_XP_PER_MOVE = 5; // how much a basic attack or defense will give in XP
	/*
	const FORMATION_WIDTH = 4;
	const FORMATION_HEIGHT = 3;	
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
		newGame: function()
		{			
			Pieces.createTestSpearmen();
			Pieces.movePieceByID(Game.getState("ID", "pieces"), Board.calculateIndexFromCartesian(1,1));
			
			Pieces.createTestEnemy();
			Pieces.movePieceByID(Game.getState("ID", "pieces"), Board.calculateIndexFromCartesian(1,2));
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
		createPiece: function(team = 1)
		{
			// let type = piecesStatistics[typeName];
			let piece = {};
			// the piece has not been placed anywhere yet and so it is null
			piece.position = null;
			piece.AP = 5;
			piece.movement = 0;
			piece.maxMovement = 0;
			
			piece.isDead = false;
			piece.killedByID = null;
			piece.team = team;
			
			piece.soldiers = [];
			/*
			// note: a soldier can occupy more than one tile, ie horses.
			piece.soldiersPosition = [];
			for(let index = 0; index < FORMATION_WIDTH * FORMATION_HEIGHT; index++)
			{
				piece.soldiersPosition.push(null);
			}
			 */
			// metrics
			piece.totalKills = 0;
			piece.totalDamageDealt = 0;
			piece.totalDamageReceived = 0;
			piece.totalDamageHealed = 0;
			piece.totalTilesMoved = 0;
			return piece;
		},
		
		// specialized factories 
		createTestSpearmen: function()
		{
			Game.createNewIDObject("pieces", () => { return Pieces.createPiece(1) } );
			
			Game.createNewIDObject("soldiers", Soldiers.createSoldierVeteran);
			Pieces.addSoldierByID(Game.getState("ID", "pieces"), Game.getState("ID", "soldiers"));
			Game.createNewIDObject("soldiers", Soldiers.createSoldierVeteran);
			Pieces.addSoldierByID(Game.getState("ID", "pieces"), Game.getState("ID", "soldiers"));
		},
		
		createTestEnemy: function()
		{
			Game.createNewIDObject("pieces", () => { return Pieces.createPiece(2) } );
			
			Game.createNewIDObject("soldiers", Soldiers.createSoldierVeteran);
			Pieces.addSoldierByID(Game.getState("ID", "pieces"), Game.getState("ID", "soldiers"));
			Game.createNewIDObject("soldiers", Soldiers.createSoldierVeteran);
			Pieces.addSoldierByID(Game.getState("ID", "pieces"), Game.getState("ID", "soldiers"));
		},
		
		getPieceByID: function(pieceID)
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
			// TODO: placeholder, to be replaced with dynamic sprites.
			let image = Assets.getImage("spearman");
			return image;
		},
		
		// returns in index form, beware
		getPiecePositionByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces",pieceID,"position");
		},

		getPieceAPByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces", pieceID, "AP");
		},
		
		getPieceMaxAPByID: function(pieceID)
		{
			// TODO: temp placeholder
			return 5;
		},
		
		getPieceMovementByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces", pieceID, "movement");
		},
		
		getPieceMaxMovementByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces", pieceID, "maxMovement");
		},
		
		getPieceMovementRangeByID: function(pieceID)
		{
			return Pieces.getPieceMovementByID(pieceID);
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
			return Game.getIDObjectProperty("pieces", pieceID, "isDead");
		},
		
		getPieceSoldierCountByID: function(pieceID)
		{
			/*
			let HPRatio = Pieces.getPieceHPByID(pieceID) / Pieces.getPieceMaxHPByID(pieceID);
			let spriteCount = Pieces.getPieceTypePropertyByID(pieceID, "formationCount") * HPRatio;
			// a half dead person is still alive.
			spriteCount = Math.ceil(spriteCount);
			 */
			let soldiers = Game.getIDObjectProperty("pieces", pieceID, "soldiers");
			return soldiers.length;
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
		/*
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
		*/
		
		getSoldierByPosition: function(pieceID, position)
		{
			let soldiersPosition = Game.getIDObjectProperty("pieces", pieceID, "soldiersPosition");
			return soldiersPosition[position];
		},
		
		addSoldierByID: function(pieceID, soldierID)
		{
			// check if soldier is valid
			let soldier = Soldiers.getSoldierByID(soldierID);
			if(!soldier) return;
			soldier.formationID = pieceID;
			
			// TODO: factor out, this should not be accessed directly
			let soldiers = Game.getIDObjectProperty("pieces", pieceID, "soldiers");
			let soldiersPosition = Game.getIDObjectProperty("pieces", pieceID, "soldiersPosition");
			
			// TODO: placeholder
			let soldierWidth = 1;
			let soldierHeight = 1;
			/*
			// if no position, then cram it in the first possible spot.
			// if STILL there is no space, then return.
			if(position === undefined)
			{
				return; // TODO.
			}
			
			// see if it's already occupied.
			if(soldiersPosition[position])
			{
				return;
			}
			
			if(soldiers.indexOf(soldierID) > -1)
			{
				console.warn(`Pieces.addSoldierByID: soldier "${soldierID}" already found in piece "${pieceID}".`);
				return;
			}
			soldiersPosition[position] = soldierID;
			 */
			soldiers.push(soldierID);
			
			Pieces.recalculatePieceMovementByID(pieceID);
		},
		
		removeSoldierByID: function(pieceID, soldierID)
		{
			let soldier = Soldiers.getSoldierByID(soldierID);
			if(!soldier) return;
			soldier.formationID = null;
			
			// TODO: factor out, this should not be accessed directly
			let soldiers = Game.getIDObjectProperty("pieces", pieceID, "soldiers");
			let soldiersPosition = Game.getIDObjectProperty("pieces", pieceID, "soldiersPosition");
			
			// remove element in array 
			removeElementInArray(soldiers, soldierID);
			/*
			// remove all instances of its position
			for(let index = 0; index < soldiersPosition.length; index++)
			{
				let ID = soldiersPosition[index];
				if(soldierID === ID)
				{
					soldiersPosition[index] = null;
				}
			}
			 */
			 
			Pieces.recalculatePieceMovementByID(pieceID);
			
			// TODO: TEMP, if this is the last soldier, then kill the formation.
			// TODO: add an actual onkill function
			if(soldiers.length <= 0)
			{
				Game.setIDObjectProperty("pieces",pieceID,"isDead",true);
				let position = Pieces.getPiecePositionByID(pieceID);
				Board.setTilePieceOccupiedIndex(position, null);
			}
		},
		
		// takes the minimum movement of all the pieces as the movement speed of the whole piece.
		// obviously recalculated whenever there is a change in pieces.
		recalculatePieceMovementByID: function(pieceID)
		{
			// TODO: factor out, this should not be accessed directly
			let soldiers = Game.getIDObjectProperty("pieces", pieceID, "soldiers");
			let minMovement;
			
			for(let index = 0; index < soldiers.length; index++)
			{
				let soldierID = soldiers[index];
				let movement = Soldiers.getSoldierMovementByID(soldierID);
				
				if(minMovement === undefined) minMovement = movement;
				if(movement < minMovement) minMovement = movement;
			}
			
			Game.setIDObjectProperty("pieces", pieceID, "maxMovement", minMovement);
			return minMovement;
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
		/*
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
		 */
		 /*
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
		 */
		 /*
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
		 */
		 /*
		fullHealPiece: function(pieceID)
		{
			let maxHP = Pieces.getPieceMaxHPByID(pieceID);
			Game.setIDObjectProperty("pieces", pieceID, "HP", maxHP);
			// we do NOT register full heal metrics because no healing ability is going to use full heal. This is used SOLELY at the end of a scenario to reset HP. It should probably be renamed accordingly.
			
			// set update flag because of a significant change
			GUI.updateUnits();
		},
		 */
		attackPiece: function(attackerID, defenderID)
		{			
			// get attack and defense
			/*
			let attack = Pieces.getPieceAttackByID(attackerID);
			let defense = Pieces.getPieceDefenseByID(defenderID);
			let weaponDamage = Pieces.getPieceAttackDamageByID(attackerID);
			let armor = Pieces.getPieceArmorByID(defenderID);
			 */
			 
			let attackerSoldiers = Game.getIDObjectProperty("pieces", attackerID, "soldiers");
			let defenderSoldiers = Game.getIDObjectProperty("pieces", defenderID, "soldiers");
			
			for(var soldierIndex = 0; soldierIndex < attackerSoldiers.length; soldierIndex++)
			{
				let attackerSoldierID = attackerSoldiers[soldierIndex];
				let defenderSoldierID = randomElementInArray(defenderSoldiers);
				
				Soldiers.attackSoldier(attackerSoldierID, defenderSoldierID);
			}
			/*
			// add some XP for the attack itself.
			// add some XP for the defender as well.
			Pieces.addXP(attackerID, BASE_XP_PER_MOVE);
			Pieces.addXP(defenderID, BASE_XP_PER_MOVE);
			 */
			GUI.updateUnits();
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
		
		spendPieceMovement: function(pieceID, amount)
		{
			let movement = Pieces.getPieceMovementByID(pieceID);
			let newMovement = movement - amount;
			
			if(newMovement < 0)
			{
				console.warn(`Pieces.spendmovement: newMovement "${newMovement}" is less than 0.`);
				newMovement = 0;
				return false;
			}
			
			return Game.setIDObjectProperty("pieces", pieceID, "movement", newMovement);
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
		/*
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
		 */
		 
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
				
				let maxMovement = Pieces.getPieceMaxMovementByID(pieceID);
				Game.setIDObjectProperty("pieces", pieceID, "movement", maxMovement);
			}
			
			// set update flag because of a significant change
			GUI.updateUnits();
			GUI.updateUI();
			
			Metrics.addMetric("turns_played",1);
		},
		/*
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
		 */
		// stress test
		/*
		TestOneHundredTurns: function()
		{
			for(index = 0; index < 100; index++)
			{
				Pieces.TestOneTurn();
			} 
		},
		
		TestOneTurn: function()
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
		},
		 */
	}
})();