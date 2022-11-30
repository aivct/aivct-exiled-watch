const VERSION = "0.1.7"; 
// basic init functions
function initialize()
{
	Game.initialize();
	
	GUI.initialize();
	Game.newGame();
	GUI.updateAll();
	
	window.requestAnimationFrame(GUI.draw);
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
		"pikeman": {
			"src": "./assets/pikeman.png",
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
		"ability_move": {
			"src": "./assets/ability_move.png",
			"type": "sprite",
		},
		"ability_melee_attack": {
			"src": "./assets/ability_melee_attack.png",
			"type": "sprite",
		},
		"ability_ranged_attack": {
			"src": "./assets/ability_ranged_attack.png",
			"type": "sprite",
		},
		"ability_sleep": {
			"src": "./assets/ability_sleep.png",
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
	@param alwaysNeedsUpdate - if a layer is always updating. 
		Even if a layer is 'basically' always updating, setting this to false and just constantly updating is fine. 
		This is more for particle and effects drawing where .draw() is actually involved in making user-end calculations 
			(like for particle position)
 */
function CanvasLayer(width = 800, height = 600, onpaint, alwaysNeedsUpdate = false)
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
	
	this.alwaysNeedsUpdate = alwaysNeedsUpdate;
	this.needsUpdate = true;
	this.onpaint = onpaint;
}

CanvasLayer.prototype.draw = function(lapse)
{
	if(!this.needsUpdate && !this.alwaysNeedsUpdate) return false;
	
	if(this.onpaint) this.onpaint(this.context, this.canvas, lapse);
	
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

/**
	Since there is no easy way to recolor sprites in JS,
	a recolored sprite literally takes an entire canvas.
 */