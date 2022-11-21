// basic init functions
function initialize()
{
	Assets.initialize();
	
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
			"spriteSheet": a sheet of sprites which can be automatically cut (TBD)
	 */
	var imagesToLoad = {
		"spearman": {
			"src": "./assets/spearman.png",
			"type": "sprite",
		},
		"undead_spearman": {
			"src": "./assets/undead_spearman.png",
			"type": "sprite",
		},
	};
	
	var images = {};
	
	var imageCount = 0;
	var imageProcessedCount = 0;
	
	var isImagesLoaded = false;
	/* private functions */
	let checkIfAllImagesAreLoaded = () => {
		if(imageProcessedCount >= imageCount)
		{
			isImagesLoaded = true;
			// put an init function here.
			return true;
		}
		// put a function here updating the progress bar
		return false;
	}
	
	let onImageLoaded = (event) => {
		imageProcessedCount++;
		checkIfAllImagesAreLoaded();
	};
	
	let onImageFailed = (event) => {
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
			for(var key in imagesToLoad)
			{
				var imagePromise = new Promise((resolve, reject) =>
				{
					let image = new Image();
					
					image.addEventListener('load', resolve);
					image.addEventListener('error', reject);
					image.src = imagesToLoad[key]?.src;
					switch(imagesToLoad[key]?.type)
					{
						case "sprite":
						default:
							images[key] = new Sprite(image);
					}
					imageCount++;
				});
			}
			imagePromise.then(onImageLoaded, onImageFailed);
			
			// just in case
			if(imageCount === 0) isImagesLoaded = true;
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
	
	It has two jobs: 
		- translate data into pixels
		- and translate pixels back into data.
 */
var GUI = (function()
{
	var GUIContainer;
	
	var mapLayer;
	var effectsLayer;
	var unitsLayer;
	
	// TODO: implement resizing
	var canvasWidth = 800;
	var canvasHeight = 600;
	
	// use for scrolling
	var offsetX;
	var offsetY;
	var tileSize;
	var tileOffset;
	
	return {
		initialize: function()
		{
			offsetX = 12;
			offsetY = 12;
			tileSize = 32;
			tileOffset = 3;
			GUI.createGUI();
		},
		
		createGUI: function()
		{
			GUIContainer = document.createElement("div");
			GUIContainer.addEventListener("mousedown",GUI.handleMousedown, false);
			GUIContainer.addEventListener("mouseup",GUI.handleMouseup, false);
			GUIContainer.addEventListener("mousemove",GUI.handleMousemove, false);
			GUIContainer.style.position = "relative";
			
			mapLayer = GUI.createMapLayer();
			GUIContainer.appendChild(mapLayer.getCanvas());
			mapLayer.getCanvas().style.position = "absolute";
			mapLayer.getCanvas().style.top = "0";
			mapLayer.getCanvas().style.left = "0";
			unitsLayer = GUI.createUnitsLayer();
			GUIContainer.appendChild(unitsLayer.getCanvas());
			unitsLayer.getCanvas().style.position = "absolute";
			unitsLayer.getCanvas().style.top = "0";
			unitsLayer.getCanvas().style.left = "0";
			
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
		
		draw: function()
		{
			mapLayer.draw();
			unitsLayer.draw();
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
			
			var units = Pieces.getPieces();
			for(var index = 0; index < units.length; index++)
			{
				var unit = units[index];
				GUI.drawUnit(context, unit);
			}
		},
		
		drawUnit: function(context, unit)
		{
			let position = unit.position;
			if(!position) return; // it's merely undeployed, doesn't matter to us at the renderer.
			
			let positionCartesian = Board.calculateCartesianFromIndex(position);
			let canvasPosition = GUI.cartesianToCanvas(positionCartesian.x, positionCartesian.y);
			
			let sprite = Pieces.getPieceImageByObject(unit);
			if(!sprite) return;
			// draw depending on its HP, most likely temp for now
			let spritesToDraw = 12;
			let unitHPPercent = unit.HP / unit.maxHP;
			spritesToDraw = unitHPPercent * spritesToDraw;
			for(let index = 0; index < spritesToDraw; index++)
			{
				// TODO: change hardcoded to something else
				let width = 6;
				let height = 6;
				let rowWidth = 4;
				let marginX = 4;
				let marginY = 2;
				let rowCount = Math.floor(index / rowWidth);
				if(rowCount === 0) context.globalAlpha = 1;
				if(rowCount === 1) context.globalAlpha = 0.66;
				if(rowCount === 2) context.globalAlpha = 0.33;
				sprite.draw(context
					, canvasPosition.x + tileSize - marginX - width * (index % rowWidth) - sprite.getWidth() - (rowCount % 2)
					, canvasPosition.y + tileSize - marginY - height * (rowCount) - sprite.getHeight());
			}
			context.globalAlpha = 1;
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
		
		updateAll: function()
		{
			mapLayer.update();
			unitsLayer.update();
		},
		
		handleMousedown: function(event)
		{
			bounds = GUIContainer.getBoundingClientRect();
	
			var mouseX = event.clientX - bounds.x;
			var mouseY = event.clientY - bounds.y;
			
			// console.log(GUI.canvasToCartesian(mouseX, mouseY));
		},
		
		handleMouseup: function(event)
		{
			bounds = GUIContainer.getBoundingClientRect();
	
			var mouseX = event.clientX - bounds.x;
			var mouseY = event.clientY - bounds.y;
		},
		
		handleMousemove: function(event)
		{
			bounds = GUIContainer.getBoundingClientRect();
	
			var mouseX = event.clientX - bounds.x;
			var mouseY = event.clientY - bounds.y;
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