/*
	"The board is set..." 
	Any map updates should go through the board.
	
	The board is coupled with the GUI for performance reasons.
	
	TODO: move pathfinding to wasm for performance
 */
var Board = (function()
{
	const DEFAULT_MAP_WIDTH = 16;
	const DEFAULT_MAP_HEIGHT = 16;
	
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
		
		getMapWidth: function()
		{
			return Game.getState("map","width");
		},
		
		getMapHeight: function()
		{
			return Game.getState("map","height");
		},
		
		getNeighboursIndexByIndex: function(index)
		{
			let neighboursDelta = [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}];
			let currentPosition = Board.calculateCartesianFromIndex(index);
			let neighbours = [];
			for(var neighbourCount = 0; neighbourCount < neighboursDelta.length; neighbourCount++)
			{
				let neighbourPosition = neighboursDelta[neighbourCount];
				neighbourPosition.x += currentPosition.x;
				neighbourPosition.y += currentPosition.y;
				// note that calculateIndexFromCartesian does not guarantee valid cartesian, and so we must check cartesian bounds first
				if(Board.isValidCartesian(neighbourPosition.x, neighbourPosition.y))
				{
					let neighbourIndex = Board.calculateIndexFromCartesian(neighbourPosition.x, neighbourPosition.y);
					neighbours.push(neighbourIndex);
				}
			}
			return neighbours;
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
		
		/*
			Calculates distance WITHOUT pathfinding.
		 */
		calculateDistanceToTileByIndex: function(index, neighbourIndex)
		{
			let cartesian = Board.calculateCartesianFromIndex(index);
			let neighbourCartesian = Board.calculateCartesianFromIndex(neighbourIndex);
			
			let deltaX = cartesian.x - neighbourCartesian.x;
			let deltaY = cartesian.y - neighbourCartesian.y;
			
			return Math.abs(deltaX) + Math.abs(deltaY);
		},
		
		/*
			Diamond shaped. ie, at range 2:
			  X
			 XXX
			XXOXX
			 XXX
			  X
			TODO: deprecate this awful code.
		 */
		calculateValidDestinationTilesDistanceByIndex: function(index, range = 1)
		{
			let tiles = Game.getState("map","tiles");
			// filter all tiles which are in range first
			let tilesInRange = [];
			for(var currentTileIndex = 0; currentTileIndex < tiles.length; currentTileIndex++)
			{
				if(Board.calculateDistanceToTileByIndex(index, currentTileIndex) <= range)
				{
					tilesInRange.push(currentTileIndex);
				}
			}
			// new algorithm:
				// neighbours algo 
				// take neighbours, if valid, addUnique, repeat up to range.
			// I just realized I re-invented dijkstra, but worse.
			let validTilesDistance = {};
			let validTiles = [];
			let lastTiles = [index];
			for(var currentRange = 1; currentRange <= range; currentRange++)
			{
				let currentTiles = [];
				for(var tileCount = 0; tileCount < lastTiles.length; tileCount++)
				{
					let neighbours = Board.getNeighboursIndexByIndex(lastTiles[tileCount]);
					for(var neighbourCount = 0; neighbourCount < neighbours.length; neighbourCount++)
					{
						let neighbour = neighbours[neighbourCount];
						// don't repeat yourself and current position is NOT a valid movement position.
						// this is a performance optimization to save us from backtracking
						if((validTiles.indexOf(neighbour) > -1) || neighbour === index) continue;
						if(Board.isTileValidDestinationByIndex(neighbour))
						{
							addUniqueElementInArray(currentTiles, neighbour);
							addUniqueElementInArray(validTiles, neighbour);
							if(validTilesDistance[neighbour] === undefined || validTilesDistance[neighbour] > currentRange)
							{
								validTilesDistance[neighbour] = currentRange;
							}
						}
					}
				}
				lastTiles = currentTiles;
			}
			return validTilesDistance;
		},
		
		/**
			Calculates distance by pathfinding.
				This DOES account for invalid tiles.
			If there is no path, return undefined.
			
			TODO: fix to prioritize least distance tiles when we add variable movecost terrains. 
			we can be lazy because all distances are 1 for now.
			
			@param originIndex - the position index of the origin tile
			@param range - the cutoff at which the algorithm will stop. if not specified, then range is infinite.
			
			@return map - a hashmap of the map indexed by tile index, and containing the distance to said tile.
		 */
		calculateTilePathfindingDistanceMapByIndex: function(originIndex, range)
		{
			// failsafe
			if(range === 0) return {};
			
			let tiles = Game.getState("map","tiles");
			
			// the distance from a point to itself is always 0.
			let tilesDistance = {};
			tilesDistance[originIndex] = 0;
			
			let tilesToVisit = [];
			let tileToVisit = originIndex;
			// do while there are still unvisited 
			// NOTE: unshift and pop creates a FIFO order
			// which does the work of sorting the closest tiles for us automatically.
			// shift is surprisingly faster than pop, and of course push is faster than unshift
			do
			{
				let tileDistance = tilesDistance[tileToVisit];
				// get neighbours
				let neighbours = Board.getNeighboursIndexByIndex(tileToVisit);
				for(let neighbourCount = 0; neighbourCount < neighbours.length; neighbourCount++)
				{
					// range limiting map size for calculating move range
					let distance = tileDistance + 1;
					if(range > 0) 
					{
						if(distance > range) continue;
					}
					
					let neighbour = neighbours[neighbourCount];
					if(!Board.isTileValidDestinationByIndex(neighbour)) continue;
					// don't repeat a visited tile.

					if(tilesDistance[neighbour] === undefined)
					{
						tilesToVisit.push(neighbour);
					}
					if(tilesDistance[neighbour] === undefined || tilesDistance[neighbour] > distance)
					{
						tilesDistance[neighbour] = distance;
					}
				}
			}
			while( (tileToVisit = tilesToVisit.shift()) !== undefined );
			
			return tilesDistance;
		},
		
		/**
			Calculates the distance to a specific tile.
		 */
		calculatePathfindingDistanceByIndex: function(originIndex, destinationIndex)
		{
			// TODO: quit being lazy and actually implement a more efficient algorithm.
			let map = Board.calculateTilePathfindingDistanceMapByIndex(originIndex, -1);
			
			return map[destinationIndex]; // undefined is a valid null-sy value, unfortunately.
		},
		
		/* 
			Only adjacent 4 counts as neighbours. 
			Ie, (1,0), (0,1), (-1,0), (0,-1).
			
		 */
		isTileNeighbourByIndex: function(index, neighbourIndex)
		{
			if(Board.calculateDistanceToTileByIndex(index, neighbourIndex) === 1) return true;
			return false;
		},
		
		getTilePieceOccupiedIndex: function(index)
		{
			let tile = Board.getTileFromIndex(index);
			if(!tile) 
			{
				console.warn(`Board.getTilePieceOccupiedIndex: cannot find tile for index "${index}".`);
				return;
			}
			return tile.pieceID;
		},
		
		isTilePieceOccupiedIndex: function(index)
		{
			let tile = Board.getTileFromIndex(index);
			if(!tile) 
			{
				console.warn(`Board.isTilePieceOccupiedIndex: cannot find tile for index "${index}".`);
				return;
			}
			if(tile.pieceID) return true;
			return false;
		},
		
		isTileValidDestinationByIndex: function(index)
		{
			let tile = Board.getTileFromIndex(index);
			if(!tile) 
			{
				console.warn(`Board.isTileValidDestinationByIndex: cannot find tile for index "${index}".`);
				return;
			}
			
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