/*
	"...the pieces are moving..."
	
	Like chess, a piece that can move and attack.
	
	
	
	In later versions, a piece shall comprise of the soldiers/monsters drafted to fight.
	Its attack/defense function is also relegated to an aggregation of individual functions.
	
	TODO:
		// kill all the dead pieces which have no meaningful connection.
		Pieces.prune();
		
		Overhaul levels to account for promotions (0.2.x);
		
		Unify pieces, AP, and abilities.
			getAPCost for ability X
 */
var Pieces = (function()
{
	const BASE_XP_PER_MOVE = 5; // how much a basic attack or defense will give in XP
	
	var piecesStatistics = 
	{
		"spearman": {
			"name": "Spearman",
			"image": "spearman",
			"HP": 100,
			"AP": 3,
			"attack": 10,
			"defense": 5,
			"onKillXP": 50,
		},
		
		"undead_spearman": {
			"name": "Undead Spearman",
			"image": "undead_spearman",
			"HP": 50,
			"AP": 2,
			"attack": 8,
			"defense": 4,
			"onKillXP": 25,
		},
	};
	
	// fields
	var currentSelectedPiece = null;
	
	return {
		initialize: function()
		{
			
		},
		
		newGame: function()
		{
			let createGenericSpearman = () => {return Pieces.createPiece("spearman",1)};
			
			let createEnemySpearman = () => {return Pieces.createPiece("undead_spearman",2)};
			
			// TESTING
			Game.createNewIDObject("pieces", createGenericSpearman);
			Game.createNewIDObject("pieces", createGenericSpearman);
			Game.createNewIDObject("pieces", createGenericSpearman);
			
			Game.createNewIDObject("pieces", createEnemySpearman);
			
			Pieces.movePieceById(1001, Board.calculateIndexFromCartesian(1,1));
			Pieces.movePieceById(1002, Board.calculateIndexFromCartesian(2,2));
			Pieces.movePieceById(1003, Board.calculateIndexFromCartesian(1,3));
			
			Pieces.movePieceById(1004, Board.calculateIndexFromCartesian(10,1));
			Pieces.movePieceById(1004, Board.calculateIndexFromCartesian(4,2));
			
			Pieces.abilityMovePiece(1002, Board.calculateIndexFromCartesian(3,2));
			Pieces.abilityMeleeAttackPiece(1002, 1004);
			Pieces.abilityMeleeAttackPiece(1002, 1004);
			Pieces.abilityMeleeAttackPiece(1002, 1004);
			Pieces.abilityMeleeAttackPiece(1004, 1002);
			Pieces.abilityMeleeAttackPiece(1004, 1002);
			Pieces.abilityMeleeAttackPiece(1004, 1002);
			Pieces.abilityMeleeAttackPiece(1004, 1002);
			
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
			piece.kills = 0;
			piece.isDead = false;
			piece.team = team;
			piece.traits = [];
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
			
			return baseAttack;
		},
		
		getPieceDefenseByID: function(pieceID)
		{
			let baseDefense = Pieces.getPieceTypePropertyByID(pieceID, "defense");
			
			return baseDefense;
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
			if(XP > 100) {XP -= 100; level++;}
			if(XP > 150) {XP -= 150; level++;}
			if(XP > 200) {XP -= 200; level++;}
			if(XP > 250) {XP -= 250; level++;}
			if(XP > 300) {XP -= 300; level++;}
			
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
		
		movePieceById: function(pieceID, newPosition)
		{
			// check if new position is occupied
			if(Board.isTilePieceOccupiedIndex(newPosition))
			{
				console.warn(`Pieces.movePieceById: cannot move piece "${pieceID}" newPosition "${newPosition}" is already occupied!`);
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
		},
		
		killPiece: function(pieceID, sourceID)
		{
			// housekeeping
			Game.setIDObjectProperty("pieces",pieceID,"isDead",true);
			// free its position
			let position = Pieces.getPiecePositionByID(pieceID);
			Board.setTilePieceOccupiedIndex(position, null);
			
			// give XP to the killer (if it exists)
			let onKillXP = Pieces.getPieceOnKillXPByID(pieceID);
			if(sourceID) 
			{
				Pieces.addXP(sourceID, onKillXP);
				Game.changeIDObjectProperty("pieces", sourceID, "kills", 1);
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
		},
		
		fullHealPiece: function(pieceID)
		{
			let maxHP = Pieces.getPieceMaxHPByID(pieceID);
			Game.setIDObjectProperty("pieces", pieceID, "HP", maxHP);
			
			// set update flag because of a significant change
			GUI.updateUnits();
		},
		
		attackPiece: function(attackerID, defenderID)
		{
			// get attack and defense
			let attack = Pieces.getPieceAttackByID(attackerID);
			
			let defense = Pieces.getPieceDefenseByID(defenderID);
			
			let damage = attack - defense; 
			// don't worry, negative values are handled already.
			Pieces.damagePiece(defenderID, damage, attackerID);
			
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
		
		// helper function to mark all the blue tiles for valid movement
		getValidMovementMap: function(pieceID)
		{
			let piecePosition = Pieces.getPiecePositionByID(pieceID);
			if(!piecePosition) return;
			
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
		
		/*
			Ability functions require APs,
			Interfaces with GUI.
				must be FOOLPROOF. Check EVERYTHING.
		 */
		abilityMovePiece: function(pieceID, destinationPosition)
		{
			let originPosition = Pieces.getPiecePositionByID(pieceID);
			// obviously forget it if we're not moving.
			if(originPosition === destinationPosition) return;
			// first check if destination tile is valid 
			if(!Board.isTileValidDestinationByIndex(destinationPosition))
			{
				return;
			}
			let AP = Pieces.getPieceAPByID(pieceID);
			let range = Pieces.getPieceMovementRangeByID(pieceID);
			
			let movementMap = Board.calculateTilePathfindingDistanceMapByIndex(originPosition, range);
			// if not within range, then do nothing.
			if(movementMap[destinationPosition] === undefined)
			{
				return;
			}
			// assume 1AP per move cost.
			let APCost = movementMap[destinationPosition];
			Pieces.spendPieceAP(pieceID, APCost);
			// now actually move
			Pieces.movePieceById(pieceID, destinationPosition);
		},
		
		abilityMeleeAttackPiece: function(attackerID, defenderID)
		{
			let attackerPosition = Pieces.getPiecePositionByID(attackerID);
			let defenderPosition = Pieces.getPiecePositionByID(defenderID);
			
			// if not neighbours, we cannot reach in melee
			if(!Board.isTileNeighbourByIndex(attackerPosition, defenderPosition));
			
			let AP = Pieces.getPieceAPByID(attackerID);
			let APCost = 1;
			if(APCost > AP) return; // JIC 
			Pieces.spendPieceAP(attackerID, APCost);
			// now actually attack
			Pieces.attackPiece(attackerID, defenderID);
		},
		
		/*
			GUI and UI related
		 */
		getSelectedPiece: function()
		{
			return currentSelectedPiece;
		},			
		 
		selectPiece: function(pieceID)
		{
			// cannot select dead pieces 
			if(Pieces.isPieceDeadByID(pieceID)) return;
			currentSelectedPiece = pieceID;
			GUI.updateEffects();
		},
		
		deselectPiece: function()
		{
			currentSelectedPiece = null;
			GUI.updateEffects();
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
		},
		
		AITurn: function()
		{
			// TODO:
			// really dumb AI. for now, just move left, 
			// and if you can't move left, then attack something close 
			// and if you can't attack something close, well tough luck.
		},
	}
})();