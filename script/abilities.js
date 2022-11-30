/*
	"...We come to it at last..."
	
	TODO:
	
	Unify pieces, AP, and abilities.
			getAPCost for ability X
		
			Overhaul AP costs.
				Ie, a horseman with 5 attacks per turn is too OP,
					and even 3 attacks is stretching it.
					
	//goal
	 attack once per turn.
	TODO: isRanged, canHeal, etc
	 
	 factor movement OUT, or at least out in the general UI flow (perhaps make it the default null?

 */
var Abilities = (function()
{
	var abilitiesStatistics = {
		"ability_move": {
			"abilityName": "ability_move",
			"image": "ability_move",
			"AP": "variable", // placeholder, it's dynamic and won't showup in tooltip
		},
		
		"ability_melee_attack": {
			"abilityName": "ability_melee_attack",
			"image": "ability_melee_attack",
			"AP": 1,
		},
	}
	
	var selectedAbilityName = null;
	
	return {
		
		getAbilities: function()
		{
			return abilitiesStatistics;
		},
		
		/*
			Ability functions require APs,
			Interfaces with GUI.
				must be FOOLPROOF. Check EVERYTHING.
				
			API for abilities:
				(pieceID, tilePosition)
		 */
		
		abilityMovePiece: function(pieceID, destinationPosition)
		{
			let AP = Pieces.getPieceAPByID(pieceID);
			let range = Pieces.getPieceMovementRangeByID(pieceID);
			
			let APCost = Pieces.movePieceWithPathfindingByID(pieceID, destinationPosition, range);
			if(APCost > 0)
			{
				Pieces.spendPieceAP(pieceID, APCost);
			}
		},
		
		abilityMeleeAttackPiece: function(attackerID, defenderID)
		{
			// you can't attack yourself!
			if(attackerID === defenderID) return;
			// or your friends!
			if(Pieces.getPieceTeamByID(attackerID) === Pieces.getPieceTeamByID(defenderID)) return;
			
			let attackerPosition = Pieces.getPiecePositionByID(attackerID);
			let defenderPosition = Pieces.getPiecePositionByID(defenderID);
			
			// if not neighbours, we cannot reach in melee
			if(!Board.isTileNeighbourByIndex(attackerPosition, defenderPosition)) return;
			
			let AP = Pieces.getPieceAPByID(attackerID);
			let APCost = 1;
			if(APCost > AP) return; // JIC 
			Pieces.spendPieceAP(attackerID, APCost);
			// now actually attack
			Pieces.attackPiece(attackerID, defenderID);
		},
		
		/* GUI/API */
		
		getSelectedAbility: function()
		{
			return selectedAbilityName;
		},
		
		setSelectedAbility: function(name)
		{
			Pieces.deselectBuyPiece();
			selectedAbilityName = name;
			GUI.updateUI();
		},
		
		deselectAbility: function()
		{
			selectedAbilityName = null;
			
			GUI.updateUI();
		},
	}
})();

/*
	"...The great battle in our own time." — Gandalf the White
 */
 // scenarios probably.