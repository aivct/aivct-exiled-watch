/*
	"...the pieces are moving..."
	
	Like chess, a piece that can move and attack. 
	A piece is an aggregation of its individual soldiers.
				
	NOTE:
		Decompose:
		KillerID ->
			KillerType 
			KillerID
		
		uncullable: if the piece is a leader, unique, story, etc...
		a faceless mook is usually culled if it's dead (and sometimes even when alive!) after a battle, 
			but if it's killed someone important, then it gets to live on (and may become the player's greatest nemesis!)
			
		dynarow: if a unit is wounded, automatically exchange with a fresh unit to the back in melee combat.
		
	TODO:
		// remove all the dead pieces which have no meaningful connection.
		Pieces.prune();
		
		Flanking in melee 
			-replaced by actual positioning instead.
			-ie, you get to attack wounded units and reserve units.
		// TODO: getValidMeleeTargets and getValidRangedTargets
	
	TODO: Auto-retreat. If a soldier's HP is below X, then they will move to reserves.
	TODO: fix recalculating PIECE convenient stats when adding equipment to a SOLDIER
 */
var Pieces = (function()
{
	const BASE_HIT_CHANCE_PERCENT = 35; 
	const BASE_XP_PER_MOVE = 5; // how much a basic attack or defense will give in XP
	
	const MAX_AP = 2;
	// fields
	var selectedPieceID = null;
	var selectedBuyableName = null;
	
	return {
		newGame: function()
		{
			Scenarios.createScenarioBattle();
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
			piece.AP = MAX_AP;
			piece.movement = 1;
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
		/*
		getPieceImageByID: function(pieceID)
		{
			// TODO: placeholder, to be replaced with dynamic sprites.
			let team = Pieces.getPieceTeamByID(pieceID);
			
			let image;
			if(team === 1)
			{
				image = Assets.getImage("spearman");
			}
			else if (team === 2)
			{
				image = Assets.getImage("undead_spearman");
			}
			return image;
		},
		 */
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
			return MAX_AP;
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
		
		getPieceTeamByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces", pieceID, "team");
		},
		
		isPieceDeadByID: function(pieceID)
		{
			return Game.getIDObjectProperty("pieces", pieceID, "isDead");
		},
		
		getPieceSoldiersIDByID: function(pieceID)
		{
			let soldiers = Game.getIDObjectProperty("pieces", pieceID, "soldiers");
			return soldiers;
		},
		
		getPieceSoldierCountByID: function(pieceID)
		{
			let soldiers = Game.getIDObjectProperty("pieces", pieceID, "soldiers");
			return soldiers.length;
		},
		
		// returns an array of Sprites (reference) for each soldier ie. [Sprite, Sprite]
		getPieceSoldierSpritesByID: function(pieceID)
		{
			let soldiers = Game.getIDObjectProperty("pieces", pieceID, "soldiers");
			let sprites = [];
			for(let index = 0; index < soldiers.length; index++)
			{
				sprites.push(Soldiers.getSoldierImageByID(soldiers[index]));
			}
			return sprites;
		},
		
		getSoldierByPosition: function(pieceID, position)
		{
			let soldiersPosition = Game.getIDObjectProperty("pieces", pieceID, "soldiersPosition");
			return soldiersPosition[position];
		},
		
		getPieceMaxRangeByID: function(pieceID)
		{
			// TODO: factor out, this should not be accessed directly
			let soldiers = Game.getIDObjectProperty("pieces", pieceID, "soldiers");
			let maxRange;
			
			for(let index = 0; index < soldiers.length; index++)
			{
				let soldierID = soldiers[index];
				let range = Soldiers.getSoldierWeaponRangeByID(soldierID);
				
				if(maxRange === undefined) maxRange = range;
				if(range > maxRange) maxRange = range;
			}
			
			return maxRange;
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
			
			// only reset new movement when ADDING soldiers
			let newMovement = Pieces.recalculatePieceMovementByID(pieceID);
			Game.setIDObjectProperty("pieces", pieceID, "movement", newMovement);
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
		
		// not lazy eval
		isPieceRangedByID: function(pieceID)
		{
			let soldiers = Game.getIDObjectProperty("pieces", pieceID, "soldiers");
			for(let index = 0; index < soldiers.length; index++)
			{
				let soldierID = soldiers[index];
				if(Soldiers.isSoldierRangedByID(soldierID)) return true;
			}
			return false;
		},
		
		/**
			Should really be renamed setPiecePositionByID.
			
			This is a safe function to set a piece's position.
				It does all the necessary housecleaning and removing convenience references.
			
			To undeploy, simply set newPosition as null.
			
			@param pieceID - the position of the piece 
			@param newPosition - an integer index of the tile position, or null if undeployed
		 */
		movePieceByID: function(pieceID, newPosition)
		{
			// check if new position is occupied
			if(newPosition !== null && Board.isTilePieceOccupiedIndex(newPosition))
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
			
			// this is intended behaviour. if newPosition is undefined, that is an INVALID invalid value, and we will have appropriate warning.
			if(newPosition !== null)
			{
				Board.setTilePieceOccupiedIndex(newPosition, pieceID);
			}
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
			// check range.
			let attackerPosition = Pieces.getPiecePositionByID(attackerID);
			let defenderPosition = Pieces.getPiecePositionByID(defenderID);
			
			let distance = Board.calculateDistanceToTileByIndex(attackerPosition, defenderPosition);
			
			// delegate to individual soldiers
			let attackerSoldiers = Game.getIDObjectProperty("pieces", attackerID, "soldiers");
			let defenderSoldiers = Game.getIDObjectProperty("pieces", defenderID, "soldiers");
			// right now it's a random mashup.
			for(var soldierIndex = 0; soldierIndex < attackerSoldiers.length; soldierIndex++)
			{
				let attackerSoldierID = attackerSoldiers[soldierIndex];
				let defenderSoldierID = randomElementInArray(defenderSoldiers);
				
				// TODO: fix. it introduces weird bugs with melee ranged attacks.
				if(distance === 1)
				{
					Soldiers.attackSoldier(attackerSoldierID, defenderSoldierID);
				}
				else 
				{
					if(Soldiers.isSoldierRangedByID(attackerSoldierID))
					{
						Soldiers.attackRangedSoldier(attackerSoldierID, defenderSoldierID);
					}
				}
			}
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
		
		// clean the board.
		undeployPieceByID: function(pieceID)
		{
			Pieces.movePieceByID(pieceID, null);
		},
		
		undeployAllPieces: function()
		{
			let pieces = Pieces.getLivingPiecesID();
			for(let index = 0; index < pieces.length; index++)
			{
				let pieceID = pieces[index];
				Pieces.undeployPieceByID(pieceID);
			}
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
		
		// straight line
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
				 
		/* End Turn */	
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
			selectedPieceID = pieceID;
			GUI.updateUI();
		},
		
		deselectPiece: function()
		{
			selectedPieceID = null;
			GUI.updateUI();
		},
		
		deselectAllSelected: function()
		{
			Pieces.deselectPiece();
			Abilities.deselectAbility();
		},
	}
})();