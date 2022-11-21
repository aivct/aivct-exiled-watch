/*
	"The board is set..." — Gandalf the White
	Any map updates should go through the board.
	
	The board is coupled with the GUI for performance reasons.
 */
var Board = (function()
{
	const DEFAULT_MAP_WIDTH = 16;
	const DEFAULT_MAP_HEIGHT = 8;
	
	return {
		createMap: function(width = DEFAULT_MAP_WIDTH, height = DEFAULT_MAP_HEIGHT)
		{
			let tiles = [];
			for(let index = 0; index < width * height; index++)
			{
				let tile = Board.createTile(index);
				tiles.push(tile);
			}
		
			Game.setState("map","width",width);
			Game.setState("map","height",height);
			Game.setState("map","tiles",tiles);
			
			// now draw!
			GUI.updateMap();
		},
		/*
			we use a factory function instead of a constructor 
				because we don't want to use prototypes, since our data should be primitives
				though we still want to save writing this code out many times.
		 */
		createTile: function(index)
		{
			let tile = {};
			tile.index = index; // just in case, and for debugging.
			
			// for convenience's sake.
			tile.buildingID = null;
			tile.pieceID = null;
			return tile;
		},
		
		getTileFromIndex: function(index)
		{
			if(Board.isValidIndex(index))
			{
				var tiles = Game.getState("map","tiles");
				return tiles[index];
			}
			return null;
		},
		
		getTileFromCartesian: function(x, y)
		{
			var index = Board.calculateIndexFromCartesian(x, y);
			return Board.getTileFromIndex(index);
		},
		
		calculateCartesianFromIndex: function(index)
		{
			var width = Game.getState("map","width");
			var height = Game.getState("map","height");
			
			var x = index % width;
			var y = Math.floor(index / width);
			
			return {x: x, y: y};
		},
		
		calculateIndexFromCartesian: function(x, y)
		{
			var width = Game.getState("map","width");
			var height = Game.getState("map","height");
			
			var index = y * width + x;
			
			return index;
		},
		
		isTilePieceOccupiedIndex: function(index)
		{
			let tile = Board.getTileFromIndex(index);
			if(!tile) console.warn(`Board.isTilePieceOccupiedIndex: cannot find tile for index "${index}".`);
			if(tile.pieceID) return true;
			return false;
		},
		
		isTileValidDestinationByIndex: function(index)
		{
			let tile = Board.getTileFromIndex(index);
			if(!tile) console.warn(`Board.isTileValidDestinationByIndex: cannot find tile for index "${index}".`);
			
			if(tile.pieceID) return false;
			if(tile.buildingID) return false;
			return true;
		},
		
		// set ID to null to clear
		setTilePieceOccupiedIndex: function(index, ID)
		{
			let tile = Board.getTileFromIndex(index);
			if(!tile)
			{
				console.warn(`Board.setTilePieceOccupiedIndex: invalid index "${index}".`);
				return;
			}
			// we can play a little loosey-goosey right now since tile.pieceID is a convenience value that doesn't really impact anything
			// TODO: factor this out into Game.set something
			tile.pieceID = ID;
		},
		
		isValidCartesian: function(x, y)
		{
			var width = Game.getState("map","width");
			var height = Game.getState("map","height");
			
			if(x >= 0
				&& x < width 
				&& y >= 0
				&& y < height)
			{
				return true;
			}
			return false;
		},
		
		isValidIndex: function(index)
		{
			var width = Game.getState("map","width");
			var height = Game.getState("map","height");
			
			if(index !== null // damn JS autocasting
				&& index >= 0
				&& index < width * height)
			{
				return true;
			}
			return false;
		},
	}
})();