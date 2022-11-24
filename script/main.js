const VERSION = "0.1.0"; 
 
// TODO: create teams
// basic init functions
function initialize()
{
	Game.initialize();
	Pieces.initialize();
	
	GUI.initialize();
	Game.newGame();
	GUI.updateAll();
	
	window.requestAnimationFrame(draw);
}


function draw()
{
	GUI.draw();
	window.requestAnimationFrame(draw);
}

/*
	Loads images, and that's about it.
	Oh, and provides a nice progress summary. Eventually. We'll get around to it.
 */
var Assets = (function()
{
	/*
		Image types:
			"sprite": simple as that, a humble image
			"sheet": a sheet of sprites which can be automatically cut
	 */
	var imagesToLoad = {
		"spearman": {
			"src": "./assets/spearman.png",
			"type": "sprite",
		},
		"swordsman": {
			"src": "./assets/swordsman.png",
			"type": "sprite",
		},
		"horseman": {
			"src": "./assets/horseman.png",
			"type": "sprite",
		},
		"undead_spearman": {
			"src": "./assets/undead_spearman.png",
			"type": "sprite",
		},
		"XP_ranks_sheet": {
			"src": "./assets/XP_ranks_sheet.png",
			"type": "sheet",
			"cut": "regular",
			"spriteWidth": 9,
			"spriteHeight": 16,
		},
	};

	var images = {};
	var sheetsToCut = {};
	
	var imageCount = 0;
	var imageProcessedCount = 0;
	
	var isImagesLoaded = false;
	/* private functions */
	var cutAllSheets = () => {
		for(let key in sheetsToCut)
		{
			Assets.cutSheet(key);
		}
	}
	
	var checkIfAllImagesAreLoaded = () => {
		console.log(`Assets: loading image ${imageProcessedCount}/${imageCount}...`);
		if(imageProcessedCount >= imageCount)
		{
			isImagesLoaded = true;
			cutAllSheets();
			initialize();
			return true;
		}
		// put a function here updating the progress bar
		return false;
	}
	
	var onImageLoaded = (event) => {
		imageProcessedCount++;
		checkIfAllImagesAreLoaded();
	};
	
	var onImageFailed = (event) => {
		console.warn(`Image not found: ${event.target.src}.`);
		imageProcessedCount++;
		checkIfAllImagesAreLoaded();
	};
	
	return {
		initialize: function()
		{
			imageCount = 0;
			Assets.loadImages();
		},
		
		loadImages: function()
		{
			for(let key in imagesToLoad)
			{
				let imagePromise = new Promise((resolve, reject) =>
				{
					let image = new Image();
					
					image.addEventListener('load', resolve);
					image.addEventListener('error', reject);
					image.src = imagesToLoad[key]?.src;
					
					images[key] = new Sprite(image);
					imageCount++;
				});
				
				imagePromise.then(onImageLoaded, onImageFailed);
				switch(imagesToLoad[key]?.type)
				{
					case "sheet":
						sheetsToCut[key] = key;
					case "sprite":
					default:
						break;
				}
			}
			
			// just in case
			if(imageCount === 0) isImagesLoaded = true;
		},
		
		cutSheet: function(key)
		{
			let image = Assets.getImage(key);
			let definition = imagesToLoad[key];
			if(!image) 
			{
				console.warn(`Assets.cutSheet: cannot find image "${key}".`);
				return;
			}
			if(!definition)
			{
				// something has gone VERY wrong (most likely we're cutting a sprite instead of a sheet)
				console.warn(`Assets.cutSheet: cannot find definition "${key}".`);
			}
			
			let cuttingCount = 0;
			for(let x = 0, width = image.getWidth(); x < width; x+=definition.spriteWidth)
			{
				cuttingCount++;
				var spriteName = `${key}_${cuttingCount}`;
				
				images[spriteName] = new SpriteImage(image.image, x, 0, definition.spriteWidth, definition.spriteHeight);
			}
		},
		
		getImage: function(key)
		{
			return images[key];
		},
	}
})();

/*
	At present, a glorified namespace for different canvas layers.
	
	This should be closely coupled with the Game module, and nothing else.
	
	GUI functions should not throw errors. If something is weird, at most, log it. Glitches are fine.
	
	It has two jobs: 
		- translate data into pixels
		- and translate pixels back into data.
 */
var GUI = (function()
{
	var GUIContainer;
	
	var mapLayer;
	var unitsLayer;
	var effectsLayer;
	
	// TODO: implement resizing
	var canvasWidth = 800;
	var canvasHeight = 600;
	
	// use for scrolling
	var offsetX;
	var offsetY;
	var tileSize;
	var tileOffset;
	
	var mousedownTile = null;
	
	return {
		initialize: function()
		{
			offsetX = 112;
			offsetY = 112;
			tileSize = 32;
			tileOffset = 5;
			GUI.createGUI();
		},
		
		createGUI: function()
		{
			GUIContainer = document.createElement("div");
			GUIContainer.addEventListener("pointerdown",GUI.handlePointerdown, false);
			GUIContainer.addEventListener("pointerup",GUI.handlePointerup, false);
			GUIContainer.addEventListener("pointermove",GUI.handlePointermove, false);
			GUIContainer.style.position = "relative";
			
			mapLayer = GUI.createMapLayer();
			GUIContainer.appendChild(mapLayer.getCanvas());
			
			unitsLayer = GUI.createUnitsLayer();
			GUIContainer.appendChild(unitsLayer.getCanvas());
			
			effectsLayer = GUI.createEffectsLayer();
			GUIContainer.appendChild(effectsLayer.getCanvas());
			
			document.body.appendChild(GUIContainer);
		},
		
		createMapLayer: function()
		{
			let layer = new CanvasLayer(canvasWidth, canvasHeight, GUI.drawMap);
			layer.width = canvasWidth;
			layer.height = canvasHeight;
			
			return layer;
		},
		
		createUnitsLayer: function()
		{
			let layer = new CanvasLayer(canvasWidth, canvasHeight, GUI.drawUnits);
			layer.width = canvasWidth;
			layer.height = canvasHeight;
			
			return layer;
		},
		
		createEffectsLayer: function()
		{
			let layer = new CanvasLayer(canvasWidth, canvasHeight, GUI.drawEffects);
			layer.width = canvasWidth;
			layer.height = canvasHeight;
			
			return layer;
		},
		
		draw: function()
		{
			mapLayer.draw();
			unitsLayer.draw();
			effectsLayer.draw();
		},
		
		drawMap: function(context, canvas)
		{
			context.clearRect(0,0,canvas.width,canvas.height);
			
			context.fillStyle="#000000";
			context.fillRect(0,0,canvas.width,canvas.height);
			
			let width = Game.getState("map","width");
			let height = Game.getState("map","height");

			context.strokeStyle = "#424C4C";
			context.fillStyle = "#000000";
			context.lineWidth = 2;
			for(let x = 0; x < width; x++)
			{
				for(let y = 0; y < height; y++)
				{	
					let position = GUI.cartesianToCanvas(x,y);
					
					context.beginPath();
					context.rect(position.x, position.y ,tileSize,tileSize);
					context.stroke();
					
					context.fill();
				}
			}
			
			// borders
			var borderSize = 4;
			context.lineWidth = 2;
			context.beginPath();
			context.rect(offsetX-borderSize, offsetY-borderSize, (tileSize+(tileOffset))*width-tileOffset+borderSize*2,(tileSize+(tileOffset))*height-tileOffset+borderSize*2);
			context.stroke();
			
			context.strokeStyle="#617070";
			var borderSize = 8;
			context.lineWidth = 4;
			context.beginPath();
			context.rect(offsetX-borderSize, offsetY-borderSize, (tileSize+(tileOffset))*width-tileOffset+borderSize*2,(tileSize+(tileOffset))*height-tileOffset+borderSize*2);
			context.stroke();
		},
		
		drawUnits: function(context, canvas)
		{
			context.clearRect(0,0,canvas.width,canvas.height);
			
			var units = Pieces.getLivingPieces();
			for(var index = 0; index < units.length; index++)
			{
				var unit = units[index];
				GUI.drawUnit(context, unit);
			}
		},
		
		drawUnit: function(context, unit)
		{
			if(!unit) return;
			let position = unit.position;
			if(!position) return; // it's merely undeployed, doesn't matter to us at the renderer.
			
			let positionCartesian = Board.calculateCartesianFromIndex(position);
			let canvasPosition = GUI.cartesianToCanvas(positionCartesian.x, positionCartesian.y);
			
			let sprite = Pieces.getPieceImageByObject(unit);
			if(!sprite) return;
			// draw depending on its HP, most likely temp for now
			let ID = unit?.ID;
			if(!ID) return;
			let unitHPPercent = Pieces.getPieceHPByID(ID) / Pieces.getPieceMaxHPByID(ID);
			let unitLevel = Pieces.getPieceLevelByID(ID);
			let drawSettings = Pieces.getPieceTypePropertyByID(ID, "drawSettings");
			let spritesToDraw = drawSettings.formationCount;
			spritesToDraw = unitHPPercent * spritesToDraw;
			let width = drawSettings.width;
			let height = drawSettings.height;
			let rowWidth = drawSettings.rowWidth;
			let marginX = drawSettings.marginX;
			let marginY = drawSettings.marginY;
			let rowOddX = drawSettings.rowOddX;
			for(let index = 0; index < spritesToDraw; index++)
			{
				let rowCount = Math.floor(index / rowWidth);
				if(rowCount === 0) context.globalAlpha = 1;
				if(rowCount === 1) context.globalAlpha = 0.66;
				if(rowCount === 2) context.globalAlpha = 0.33;
				
				sprite.draw(context
					, canvasPosition.x + tileSize - marginX - width * (index % rowWidth) - sprite.getWidth() - ((rowCount % 2) * rowOddX)
					, canvasPosition.y + tileSize - marginY - height * (rowCount) - sprite.getHeight());
			}
			
			// XP indicator
			context.globalAlpha = 1;
			if(unitLevel > 0)
			{
				let rankSprite = Assets.getImage(`XP_ranks_sheet_${unitLevel}`);
				if(rankSprite)
				{
					rankSprite.draw(context
						, canvasPosition.x + tileSize - rankSprite.getWidth()
						, canvasPosition.y);
				}
			}
			
			// AP indicator
			let APBarRatio = Pieces.getPieceAPByID(ID) / Pieces.getPieceMaxAPByID(ID);
			
			context.fillStyle = "#9E8B00";
			context.fillRect(canvasPosition.x, canvasPosition.y + tileSize, tileSize, 3);
			
			context.fillStyle = "#FAFF00";
			context.fillRect(canvasPosition.x, canvasPosition.y + tileSize, tileSize * APBarRatio, 2);
			
			// HP indicator
			let HPBarRatio = Pieces.getPieceHPByID(ID) / Pieces.getPieceMaxHPByID(ID);
			
			context.fillStyle = "#7b0404";
			context.fillRect(canvasPosition.x, canvasPosition.y + tileSize + 4, tileSize, 3);
			
			context.fillStyle = "red";
			context.fillRect(canvasPosition.x, canvasPosition.y + tileSize + 4, tileSize * HPBarRatio, 2);
		},
		
		drawEffects: function(context, canvas)
		{
			context.clearRect(0,0,canvas.width,canvas.height);
			
			let selectedPieceID = Pieces.getSelectedPiece();
			if(selectedPieceID)
			{
				let selectedPieceAP = Pieces.getPieceAPByID(selectedPieceID);
				
				// highlight selected in green
				let selectedPiecePosition = Pieces.getPiecePositionByID(selectedPieceID);
				context.strokeStyle = "#01fe4d";
				context.lineWidth = 2;
				GUI.drawHighlightedTile(context, selectedPiecePosition);
				
				// draw movement map
				let movementMap = Pieces.getValidMovementMap(selectedPieceID);
				context.strokeStyle = "blue";
				context.fillStyle = "blue";
				for(var tileIndex in movementMap)
				{
					GUI.drawHighlightedTile(context, tileIndex);
					GUI.debugDrawTileText(context, tileIndex, movementMap[tileIndex]);
				}
				
				// draw attack map but ONLY if there is AP left
				if(selectedPieceAP > 0)
				{
					let validMeleeTargetsID = Pieces.getValidTargetsID(selectedPieceID, 1, "attack");
					context.strokeStyle = "red";
					for(let targetCount = 0; targetCount < validMeleeTargetsID.length; targetCount++)
					{
						let targetID = validMeleeTargetsID[targetCount];
						let targetPosition = Pieces.getPiecePositionByID(targetID);
						
						GUI.drawHighlightedTile(context, targetPosition);
					}
				}
			}
		},
		
		drawHighlightedTile: function(context, tilePosition)
		{
			let positionCartesian = Board.calculateCartesianFromIndex(tilePosition);
			let canvasPosition = GUI.cartesianToCanvas(positionCartesian.x, positionCartesian.y);
			
			context.beginPath();
			context.rect(canvasPosition.x, canvasPosition.y,tileSize,tileSize);
			context.stroke();
		},
		
		/* DEBUG */
		debugDrawTileText: function(context, tilePosition, text)
		{	
			let positionCartesian = Board.calculateCartesianFromIndex(tilePosition);
			let canvasPosition = GUI.cartesianToCanvas(positionCartesian.x, positionCartesian.y);
			
			context.fillText(text, canvasPosition.x + tileSize/2, canvasPosition.y + tileSize/2);
		},
		
		cartesianToCanvas: function(x, y)
		{
			let canvasX = offsetX+(tileSize+tileOffset)*x;
			let canvasY = offsetY+(tileSize+tileOffset)*y;
			
			return {x: canvasX, y: canvasY};
		},
		
		/*
			Valid coordinates ARE NOT GUARANTEED.
		 */
		canvasToCartesian: function(x, y)
		{
			// god forbid you round, cause that's not how indices work
			let cartesianX = Math.floor((x - offsetX)/(tileSize + tileOffset));
			let cartesianY = Math.floor((y - offsetY)/(tileSize + tileOffset));
			
			return {x: cartesianX, y: cartesianY};
		},
		
		/*
			The update functions are more async and performance saving than a direct call.
			So, if within one frame, update is called a thousand times, 
				it'll still only be drawn once, at the next frame.
		 */
		updateMap: function()
		{
			mapLayer.update();
		},
		
		updateUnits: function()
		{
			unitsLayer.update();
		},
		
		updateEffects: function()
		{
			effectsLayer.update();
		},
		
		updateAll: function()
		{
			mapLayer.update();
			unitsLayer.update();
			effectsLayer.update();
		},
		
		handlePointerdown: function(event)
		{
			bounds = GUIContainer.getBoundingClientRect();
	
			var pointerX = event.clientX - bounds.x;
			var pointerY = event.clientY - bounds.y;
			
			// if its position is out of bounds, that's an invalid click.
			let positionCartesian = GUI.canvasToCartesian(pointerX, pointerY);
			if(!Board.isValidCartesian(positionCartesian.x, positionCartesian.y)) return;
			let positionIndex = Board.calculateIndexFromCartesian(positionCartesian.x, positionCartesian.y);
			
			mousedownTile = positionIndex;
		},
		
		handlePointerup: function(event)
		{
			bounds = GUIContainer.getBoundingClientRect();
	
			var pointerX = event.clientX - bounds.x;
			var pointerY = event.clientY - bounds.y;
			
			let positionCartesian = GUI.canvasToCartesian(pointerX, pointerY);
			if(!Board.isValidCartesian(positionCartesian.x, positionCartesian.y)) return;
			let positionIndex = Board.calculateIndexFromCartesian(positionCartesian.x, positionCartesian.y);
			
			// mousedown/mouseup is what constitutes a click.
			if(mousedownTile === positionIndex && mousedownTile !== null)
			{
				// TODO:this need to be factored somewhere else
				// see if we selected a piece
				let selectedPieceID = Pieces.getSelectedPiece();
				let pieceID = Board.getTilePieceOccupiedIndex(positionIndex);
				if(selectedPieceID)
				{
					if(pieceID)
					{
						// assume it's attack
						Pieces.abilityMeleeAttackPiece(selectedPieceID, pieceID);
						
						// deselect at the end of day
						Pieces.deselectPiece();
					}
					else 
					{
						// else, assume it's movement
						Pieces.abilityMovePiece(selectedPieceID, positionIndex);
						// deselect at the end of day
						Pieces.deselectPiece();
					}
				}
				else 
				{
					// assume we're selecting 
					if(pieceID)
					{
						Pieces.selectPiece(pieceID);
					}
				}
			}
			else 
			{
				mousedownTile = null;
				Pieces.deselectPiece();
			}
		},
		
		handlePointermove: function(event)
		{
			bounds = GUIContainer.getBoundingClientRect();
	
			var pointerX = event.clientX - bounds.x;
			var pointerY = event.clientY - bounds.y;
			
			let positionCartesian = GUI.canvasToCartesian(pointerX, pointerY);
			if(!Board.isValidCartesian(positionCartesian.x, positionCartesian.y)) return;
			let positionIndex = Board.calculateIndexFromCartesian(positionCartesian.x, positionCartesian.y);
		},
	};
})();

/*
	||=======================================================||
	||     _____  __      ____   _____  _____  _____  _____  ||
	||    / ___/ / /     /__ /  / ___/ / ___/ / ___/ / ___/  ||
	||   / /__  / /__  / /_/ / _\ \_  _\ \_  / __/  _\ \_    ||
	||  /____/ /____/ /_/ /_/ /____/ /____/ /____/ /____/    ||
	||                                                       ||
	||=======================================================||
	
	As far as I'm concerned, prototypes don't exist for OOP. 
	In this project, we'll be following the data. 
		All functions are going to be built around that.
	Classes are reserved for temporary things, like UI.
 */
 
/**
	A canvas container with utility functions bundled in.
	@param width - canvas width
	@param height - canvas height
	@param onpaint - function(context, canvas) triggered on draw
 */
function CanvasLayer(width = 800, height = 600, onpaint)
{
	this.canvas = document.createElement("CANVAS");
	this.canvas.width = 800;
	this.canvas.height = 600;
	this.canvas.style.position = "absolute";
	this.canvas.style.top = "0";
	this.canvas.style.left = "0";
	
	this.context = this.canvas.getContext("2d");
	this.context.webkitImageSmoothingEnabled = false;
	this.context.msImageSmoothingEnabled = false;
	this.context.imageSmoothingEnabled = false;
	
	this.needsUpdate = true;
	this.onpaint = onpaint;
}

CanvasLayer.prototype.draw = function()
{
	if(!this.needsUpdate) return false;
	
	if(this.onpaint) this.onpaint(this.context, this.canvas);
	
	this.needsUpdate = false;
	return true;
}

CanvasLayer.prototype.getCanvas = function()
{
	return this.canvas;
}

CanvasLayer.prototype.getContext = function()
{
	return this.context;
}

CanvasLayer.prototype.update = function()
{
	this.needsUpdate = true;
}

/**
	A unified image with three modes.
	Sprite, which is just a glorified wrapper for DOMImage,
	SpriteImage, which is only part of a DOMImage (like from a sprite sheet)
	and SpriteComposite, which takes several DOMImages and layers them together.
	The point is to allow for a unified draw(context,x,y,width,height) while also simplifiying image handling.
	SpriteComposites can be 'flattened' in order to save render cycles,
	but they can also be kept dynamic if the unit, like a hero, is constantly changing equipment, 
	as opposed to a class of unit which is dynamically generated but then set in stone.
 */
function Sprite(image)
{
	this.image = image;
}

Sprite.prototype.draw = function(context,x,y,width,height)
{
	// if width or height is 0, nothing is drawn anyways
	if(!width || !height) 
	{
		context.drawImage(this.image, x, y);
	}
	else 
	{
		context.drawImage(this.image, x, y, width, height);
	}
}

Sprite.prototype.getWidth = function()
{
	if(!this.image) return undefined;
	return this.image.width;
}

Sprite.prototype.getHeight = function()
{
	if(!this.image) return undefined;
	return this.image.height;
}

function SpriteImage(image, sx = 0, sy = 0, sw = 0, sh = 0)
{
	Sprite.call(this, image);
	this.sourceX = sx;
	this.sourceY = sy;
	this.sourceWidth = sw;
	this.sourceHeight = sh;
}

ObjectUtilities.inheritPrototype(SpriteImage, Sprite);

SpriteImage.prototype.draw = function(context,x,y,width,height)
{
	if(!width || !height) 
	{
		context.drawImage(this.image, this.sourceX, this.sourceY, this.sourceWidth, this.sourceHeight, x, y, this.sourceWidth, this.sourceHeight);
	}
	else 
	{
		context.drawImage(this.image, this.sourceX, this.sourceY, this.sourceWidth, this.sourceHeight, x, y, width, height);
	}
	
}

SpriteImage.prototype.getWidth = function()
{
	return this.sourceWidth;
}

SpriteImage.prototype.getHeight = function()
{
	return this.sourceHeight;
}

function SpriteComposite(width = 0, height = 0)
{
	this.layers = [];
	this.width = width;
	this.height = height;
}
// we do this to ensure the interface is implemented. I'm not happy with it.
ObjectUtilities.inheritPrototype(SpriteComposite, Sprite);

SpriteComposite.prototype.draw = function(context,x,y,width,height)
{
	context.translate(x,y);
	for(var index = 0; index < this.layers.length; index++)
	{
		var layer = this.layers[index];
		var sprite = layer.sprite;
		// floor the values because decimal values in draw are murder on performance due to canvas AA
		var imageX = Math.floor(layer.xRatio * width);
		var imageY = Math.floor(layer.yRatio * height);
		var imageWidth = Math.floor(layer.widthRatio * width);
		var imageHeight = Math.floor(layer.heightRatio * height);
		sprite.draw(context, imageX, imageY, imageWidth, imageHeight);
	}
	context.translate(-x,-y);
}

SpriteComposite.prototype.getWidth = function()
{
	return this.width;
}

SpriteComposite.prototype.getHeight = function()
{
	return this.height;
}

SpriteComposite.prototype.addLayer = function(sprite,xRatio,yRatio,widthRatio,heightRatio)
{
	var layer = new SpriteComposite(sprite,xRatio,yRatio,widthRatio,heightRatio);
	this.layers.push(layer);
}

SpriteComposite.prototype.removeLayerByImage = function(sprite)
{
	return removeObjectInArrayByProperty(this.layers, "sprite", sprite);
}

SpriteComposite.prototype.flatten = function()
{
	// todo.
}

function SpriteCompositeLayer(sprite, x, y, width, height)
{
	this.sprite = sprite;
	this.xRatio = x;
	this.yRatio = y;
	this.widthRatio = width;
	this.heightRatio = height;
}