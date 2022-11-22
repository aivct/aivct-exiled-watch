/*
	"...the pieces are moving..."
	
	A piece shall comprise of the soldiers/monsters drafted to fight.
	Its attack/defense function is also relegated to an aggregation of individual functions.
	But that's for later.
 */
var Pieces = (function()
{
	var piecesStatistics = 
	{
		"spearman": {
			"name": "Spearman",
			"image": "spearman",
			"HP": 100,
			"AP": 3,
			"attack": 10,
			"defense": 5,
		},
		
		"undead_spearman": {
			"name": "Undead Spearman",
			"image": "undead_spearman",
			"HP": 50,
			"AP": 3,
			"attack": 8,
			"defense": 4,
		},
	};
	
	// EXP formula: 100, 150, 200, 250, 300
	// >, >>, >>>, |>>>, STAR
	
	return {
		initialize: function()
		{
			
		},
		
		newGame: function()
		{
			let createGenericSpearman = () => {return Pieces.createPiece("spearman")};
			let createGenericUndeadSpearman = () => {return Pieces.createPiece("undead_spearman")};
			
			Game.createNewIDObject("pieces", createGenericSpearman);
			Game.createNewIDObject("pieces", createGenericSpearman);
			Game.createNewIDObject("pieces", createGenericSpearman);
			
			Pieces.movePiece(1001, Board.calculateIndexFromCartesian(1,1));
			Pieces.movePiece(1002, Board.calculateIndexFromCartesian(2,2));
			Pieces.movePiece(1003, Board.calculateIndexFromCartesian(1,3));
			
			Game.setIDObjectProperty("pieces", 1001, "HP", 50);
			
			Game.createNewIDObject("pieces", createGenericUndeadSpearman);
			Pieces.movePiece(1004, Board.calculateIndexFromCartesian(10,1));
			Pieces.movePiece(1004, Board.calculateIndexFromCartesian(4,2));
		},
		
		/*
			Creates a new piece.
			NOTE: do not create it directly from here. This is a factory function.
			Use Game.createNewIDObject instead!
			
			Note that the factory pattern is highly extensible.
			For example, in its parent function, we can do something like:
				createBuffspearman = () => {
					let piece = createPiece("spearman");
					piece.MaxHP = piece.MaxHP * 2;
					piece.HP = piece.MaxHP;
				}
		 */
		createPiece: function(typeName = "spearman")
		{
			let type = piecesStatistics[typeName];
			let piece = {};
			// the piece has not been placed anywhere yet and so it is null
			piece.position = null;
			piece.typeName = typeName;
			piece.HP = type.HP;
			piece.maxHP = type.HP;
			piece.AP = type.AP;
			piece.maxAP = type.AP;
			piece.EXP = 0;
			piece.isDead = false;
			piece.side = 1;
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
		
		movePiece: function(pieceID, newPosition)
		{
			// check if new position is occupied
			if(Board.isTilePieceOccupiedIndex(newPosition))
			{
				console.warn(`Pieces.movePiece: cannot move piece "${pieceID}" newPosition "${newPosition}" is already occupied!`);
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
			
			GUI.updateUnits();
		},
		
		// diamond shaped
		getValidDestinationTilesByIndex: function(originIndex, range = 1)
		{
			
		},
		
		// TODO: getPieceAttack
		// TODO: getPieceDefense
		// TODO: damagePiece
		// TODO: heal piece,
		// TODO: pieceOnEndTurn
		// TODO: piece attacked
		
		getLivingPiecesID: function()
		{
			let pieces = Game.getState("pieces");
			let livingPieces = pieces.filter(piece => {return !piece.isDead});
			let livingPiecesID = livingPieces.map(piece => {return piece.ID});
			return livingPiecesID;
		},
		
		endTurn: function()
		{
			// go through every piece which is alive and restore AP.
			let alivePieces = Pieces.getLivingPiecesID();
			for(var index = 0; index < alivePieces.length; index++)
			{
				let pieceID = alivePieces[index];
				let maxAP = Game.getIDObjectProperty("pieces", pieceID, "maxAP");
				Game.setIDObjectProperty("pieces", pieceID, "AP", maxAP);
			}
		},
	}
})();