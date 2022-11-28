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
	const DEFAULT_PARTICLE_LIFESPAN = 2000;
	const TILE_MARGIN = 5;
	
	var GUIContainer;
	var unitBuyerElement;
	var abilityToolbarElement;
	var tooltipElement;
	
	var mapLayer;
	var unitsLayer;
	var effectsLayer;
	var UILayer;
	
	// TODO: move effects to UI and add particles + particle combination
	
	// TODO: implement resizing
	var canvasWidth = 800;
	var canvasHeight = 600;
	
	// Square font should be in multiples of 6, though font height is 5, due to odd quirks in generation
	var fontFamily = "Square-Font";
	var fontSize = 18;
	// TODO: zoom
	const sizeMultiplier = 1;
	var tileSize;
	// use for scrolling
	var offsetX;
	var offsetY;
	
	var lastTime;
	// we don't unify the arrays because we're going to have separate types of particles, ie for money, for gold, etc.
	var damageTextParticles = [];
	
	var mousedownTile = null;
	var keysPressed = {
		"up":false,	
		"down":false,	
		"left":false,	
		"right":false,	
	};
	
	// just a data container.
	function Particle(x, y, data, life = DEFAULT_PARTICLE_LIFESPAN)
	{
		this.x = x;
		this.y = y;
		this.data = data;
		this.life = life;
	}
	
	Particle.prototype.draw = function(elapsed)
	{
		this.life -= elapsed;
	}
	
	Particle.prototype.isDead = function()
	{
		if(this.life < 0) return true;
		return false;
	}
	
	// merging some text effects
	Particle.prototype.merge = function(particle)
	{
		this.x = (this.x + particle.x) / 2;
		this.y = (this.y + particle.y) / 2;
		this.data = this.data + particle.data;
		this.life = Math.max(this.life, particle.life);
	}
	
	return {
		initialize: function()
		{
			offsetX = 112;
			offsetY = 112;
			tileSize = 32 * sizeMultiplier;
			GUI.createGUI();
		},
		
		createGUI: function()
		{
			document.body.addEventListener("pointerdown",GUI.handlePointerdown, false);
			document.body.addEventListener("pointerup",GUI.handlePointerup, false);
			document.body.addEventListener("pointermove",GUI.handlePointermove, false);
			document.body.addEventListener("keydown",GUI.handleKeydown, false);
			document.body.addEventListener("keyup",GUI.handleKeyup, false);
			
			GUIContainer = document.createElement("div");
			GUIContainer.style.width = "800px";
			GUIContainer.style.height = "600px";
			GUIContainer.classList.add("gui-container");
			GUIContainer.style.position = "relative";
			
			mapLayer = GUI.createMapLayer();
			GUIContainer.appendChild(mapLayer.getCanvas());
			
			unitsLayer = GUI.createUnitsLayer();
			GUIContainer.appendChild(unitsLayer.getCanvas());
			
			effectsLayer = GUI.createEffectsLayer();
			GUIContainer.appendChild(effectsLayer.getCanvas());
			
			UILayer = GUI.createUILayer();
			GUIContainer.appendChild(UILayer.getCanvas());
			
			// DOM elements 
			unitBuyerElement = GUI.createUnitBuyerElement();
			GUIContainer.appendChild(unitBuyerElement);
			
			abilityToolbarElement = GUI.createAbilityToolbarElement();
			GUIContainer.appendChild(abilityToolbarElement);
			
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
			// set to always draw because this is a layer that draws particles
			let layer = new CanvasLayer(canvasWidth, canvasHeight, GUI.drawEffects, true); 
			layer.width = canvasWidth;
			layer.height = canvasHeight;
			
			return layer;
		},
		
		createUILayer: function()
		{
			let layer = new CanvasLayer(canvasWidth, canvasHeight, GUI.drawUI);
			layer.width = canvasWidth;
			layer.height = canvasHeight;
			
			return layer;
		},
		
		createUnitBuyerElement: function()
		{
			let element = document.createElement("div");
			element.style.position = "absolute";
			element.style.top = "50px";
			element.style.left = "0";
			element.classList.add("gui-element");
			
			let header = document.createElement("h1");
			let textNode = document.createTextNode("UNITS");
			header.appendChild(textNode);
			element.appendChild(header);
			
			// add units within it.
			var buyablePieces = Pieces.getBuyablePieces();
			for(var index = 0; index < buyablePieces.length; index++)
			{
				var type = buyablePieces[index];
				let buyUnitButton = GUI.createUnitBuyerButtonElement(type);
				element.appendChild(buyUnitButton);
			}
			
			return element;
		},
		
		createUnitBuyerButtonElement: function(type)
		{
			let element = document.createElement("div");
			element.classList.add("gui-square-button");
			element.onclick = () => { Pieces.setSelectedBuyPiece(type.typeName) };
			
			let icon = document.createElement("canvas");
			icon.width = tileSize;
			icon.height = tileSize;
			let iconContext = icon.getContext("2d");
			iconContext.webkitImageSmoothingEnabled = false;
			iconContext.msImageSmoothingEnabled = false;
			iconContext.imageSmoothingEnabled = false;
			
			let imageName = type.image;
			let image = Assets.getImage(imageName);
			if(!image)
			{
				console.warn(`GUI.createUnitBuyerButtonElement: no image of ${imageName} found.`);
				return;
			}
			let width = image.getWidth() * 1;
			let height = image.getHeight() * 1;
			image.draw(iconContext, Math.floor(icon.width/2-width/2),icon.height - height, width, height);
			
			element.appendChild(icon);
			
			return element;
		},
		//TODO: hide and update
		createAbilityToolbarElement: function()
		{
			let element = document.createElement("div");
			element.style.position = "absolute";
			element.style.bottom = "0";
			element.style.left = "0";
			element.classList.add("gui-element");
			
			let header = document.createElement("h1");
			let textNode = document.createTextNode("ABILITIES");
			header.appendChild(textNode);
			element.appendChild(header);
			
			let abilities = Abilities.getAbilities();
			for(let key in abilities)
			{
				let ability = abilities[key];
				let button = GUI.createAbilityToolbarButtonElement(ability);
				element.appendChild(button);
			}
			
			return element;
		},
		
		createAbilityToolbarButtonElement: function(ability)
		{
			let element = document.createElement("div");
			element.classList.add("gui-square-button");
			element.classList.add("horizontal");
			element.onclick = () => { Abilities.setSelectedAbility(ability.abilityName) };
			
			let icon = document.createElement("canvas");
			icon.width = tileSize;
			icon.height = tileSize;
			let iconContext = icon.getContext("2d");
			iconContext.webkitImageSmoothingEnabled = false;
			iconContext.msImageSmoothingEnabled = false;
			iconContext.imageSmoothingEnabled = false;
			
			let imageName = ability.image;
			let image = Assets.getImage(imageName);
			if(!image)
			{
				console.warn(`GUI.createAbilityToolbarButtonElement: no image of ${imageName} found.`);
				return;
			}
			let width = image.getWidth() * 1;
			let height = image.getHeight() * 1;
			image.draw(iconContext, 0, 0);
			
			element.appendChild(icon);
			
			return element;
		},
		
		createTooltipElement: function()
		{
			
		},
		
		draw: function(timestamp)
		{
			if(!lastTime)
			{
				lastTime = timestamp;
			}
			let elapsed = timestamp - lastTime;
			
			mapLayer.draw(elapsed);
			unitsLayer.draw(elapsed);
			effectsLayer.draw(elapsed);
			UILayer.draw(elapsed);
			
			// TODO: factor the following out
			let delta = Math.floor(elapsed * (200 / 1000));
			if(keysPressed["left"])
			{
				GUI.panBoardX(-delta);
			}
			if(keysPressed["right"])
			{
				GUI.panBoardX(delta);
			}
			if(keysPressed["up"])
			{
				GUI.panBoardY(-delta);
			}
			if(keysPressed["down"])
			{
				GUI.panBoardY(delta);
			}
			
			lastTime = timestamp;
			window.requestAnimationFrame(GUI.draw);
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
			context.rect(offsetX-borderSize, offsetY-borderSize, (tileSize+(TILE_MARGIN))*width-TILE_MARGIN+borderSize*2,(tileSize+(TILE_MARGIN))*height-TILE_MARGIN+borderSize*2);
			context.stroke();
			
			context.strokeStyle="#617070";
			var borderSize = 8;
			context.lineWidth = 4;
			context.beginPath();
			context.rect(offsetX-borderSize, offsetY-borderSize, (tileSize+(TILE_MARGIN))*width-TILE_MARGIN+borderSize*2,(tileSize+(TILE_MARGIN))*height-TILE_MARGIN+borderSize*2);
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
			if(!position && position !== 0) return; // it's merely undeployed, doesn't matter to us at the renderer.
			
			let positionCartesian = Board.calculateCartesianFromIndex(position);
			let canvasPosition = GUI.cartesianToCanvas(positionCartesian.x, positionCartesian.y);
			
			let sprite = Pieces.getPieceImageByObject(unit);
			if(!sprite) return;
			// draw depending on its HP, most likely temp for now
			let ID = unit?.ID;
			if(!ID) return;
			let unitLevel = Pieces.getPieceLevelByID(ID);
			let drawSettings = Pieces.getPieceTypePropertyByID(ID, "drawSettings");
			let spritesToDraw = drawSettings.formationCount;
			spritesToDraw = Pieces.getPieceSoldierCountByID(ID);
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
				if(rowCount === 2) context.globalAlpha = 0.50;
				if(rowCount === 3) context.globalAlpha = 0.33;
				
				sprite.draw(context
					, canvasPosition.x + tileSize - marginX - width * (index % rowWidth) * sizeMultiplier - (sprite.getWidth() * sizeMultiplier) - ((rowCount % 2) * rowOddX * sizeMultiplier)
					, canvasPosition.y + tileSize - marginY - height * (rowCount) * sizeMultiplier - (sprite.getHeight() * sizeMultiplier)
					, (sprite.getWidth() * sizeMultiplier)
					, (sprite.getHeight() * sizeMultiplier) );
			}
			
			// XP indicator
			context.globalAlpha = 1;
			if(unitLevel > 0)
			{
				let rankSprite = Assets.getImage(`XP_ranks_sheet_${unitLevel}`);
				if(rankSprite)
				{
					rankSprite.draw(context
						, canvasPosition.x + tileSize - (rankSprite.getWidth() * sizeMultiplier)
						, canvasPosition.y
						, (rankSprite.getWidth() * sizeMultiplier)
						, (rankSprite.getHeight() * sizeMultiplier) );
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
		
		drawEffects: function(context, canvas, lapse)
		{
			context.clearRect(0,0,canvas.width,canvas.height);
			
			// TODO: change this because it's a bloody mess
			// draw damage particles.
			// plus, get bigger with more damage
			context.fillStyle = "red";
			for(let index = 0; index < damageTextParticles.length; index++)
			{
				let particle = damageTextParticles[index];
				// particle.draw() isn't actually drawing, only calculating
				particle.draw(lapse);
				// now change x and y 
				particle.x += 0;
				particle.y += -(lapse/50);
				let sizeMultiplier = Math.max(Math.min(Math.sqrt(particle.data) / 5,2),1);
				let particleFontSize = Math.round(sizeMultiplier * 12);
				let font = `${particleFontSize}px ${fontFamily}`;
				if(context.font !== font) context.font = font;
				
				let text = `${particle.data}`;
				// draw
				context.fillText(text, Math.floor(particle.x + offsetX), Math.floor(particle.y + offsetY));
			}
			// remove dead particles
			if(damageTextParticles.length > 0)
			{
				damageTextParticles = damageTextParticles.filter( (particle) => { return !particle.isDead() } );
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
		
		addParticleAbovePiece: function(type, data, pieceID)
		{
			// settings, cut it off at the source!
			if(!Game.getState("settings","particlesEnabled")) return;
			
			let piecePosition = Pieces.getPiecePositionByID(pieceID);
			if(!piecePosition && piecePosition !== 0)
			{
				console.warn(`GUI.addParticleAbovePiece: cannot find position for pieceID ${pieceID}.`);
				// guard statement for invalid pieceID
				return;
			}
			
			let positionCartesian = Board.calculateCartesianFromIndex(piecePosition);
			let canvasPosition = GUI.cartesianToCanvas(positionCartesian.x, positionCartesian.y);
			
			// remove offsetX and offsetY because we're adding it layer. This way particles will stick with the main board.
			let x = canvasPosition.x + tileSize/2 + randomInteger(-2, 2) - offsetX;
			let y = canvasPosition.y + tileSize/2 - offsetY;
			let particle = new Particle(x, y, data);
			
			if(type === "damage")
			{
				// if we can get a closer effect, then merge into it.
				let closeParticle = GUI.findParticleWithinLength(type, particle, 5);
				
				if(!closeParticle)
				{
					damageTextParticles.push(particle);
				}
				else 
				{
					closeParticle.merge(particle);
				}
			}
			
			return particle;
		},
		
		// gets a random particle within length FIFO
		findParticleWithinLength: function(type, comparedParticle, length = 5)
		{
			var array;
			if(type === "damage")
			{
				array = damageTextParticles;
			}
			if(!array) return;
			
			for(let index = 0; index < array.length; index++)
			{
				let particle = array[index];
				
				let dx = comparedParticle.x - particle.x;
				let dy = comparedParticle.y - particle.y;
				
				let distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
				
				if(distance < length) return particle;
			}
			return;
		},
		
		// not the big UI, but in game UI (ie highlighting selected and valid tiles)
		drawUI: function(context, canvas)
		{
			context.clearRect(0,0,canvas.width,canvas.height);
			
			let font = `${fontSize}px ${fontFamily}`;
			if(context.font !== font) context.font = font;
			
			let buyablePieceID = Pieces.getSelectedBuyPiece();
			if(buyablePieceID)
			{
				// TODO: change the hardcoded assumption that 1 is the player team
				let highlightedTiles = Pieces.getValidSpawnPositions(1);
				for(var index = 0; index < highlightedTiles.length; index++)
				{
					let tilePosition = highlightedTiles[index];
					context.strokeStyle = "yellow";
					context.lineWidth = 2;
					GUI.drawHighlightedTile(context, tilePosition);
				}
			}
			
			let selectedPieceID = Pieces.getSelectedPiece();
			if(selectedPieceID)
			{
				
				// highlight selected in green
				let selectedPiecePosition = Pieces.getPiecePositionByID(selectedPieceID);
				context.strokeStyle = "#01fe4d";
				context.lineWidth = 2;
				GUI.drawHighlightedTile(context, selectedPiecePosition);
				
				let abilityName = Abilities.getSelectedAbility();
				switch(abilityName)
				{
					case "ability_melee_attack":
						// draw attack map but ONLY if there is AP left
						let selectedPieceAP = Pieces.getPieceAPByID(selectedPieceID);
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
						break;
					case "ability_move":
					default:
						// draw movement map
						let movementMap = Pieces.getValidMovementMap(selectedPieceID);
						context.strokeStyle = "blue";
						context.fillStyle = "blue";
						for(var tileIndex in movementMap)
						{
							GUI.drawHighlightedTile(context, tileIndex);
							GUI.debugDrawTileText(context, tileIndex, movementMap[tileIndex]);
						}
						break;
				}
			}
		},
		
		// TODO: redo UI for better flow
		onTileClick: function(positionIndex)
		{
			// see if we selected a piece
			let abilityName = Abilities.getSelectedAbility();
			let buyPieceName = Pieces.getSelectedBuyPiece();
			let selectedPieceID = Pieces.getSelectedPiece();
			let pieceID = Board.getTilePieceOccupiedIndex(positionIndex);
			
			if(buyPieceName)
			{				
				// TODO: change hardcoded team assumption 
				// see if tile is valid 
				let validSpawnLocations = Pieces.getValidSpawnPositions(1);
				if(validSpawnLocations.indexOf(positionIndex) > -1)
				{
					Pieces.buyAndSpawnPiece(buyPieceName, positionIndex);
				}
				
				// deselect when we're done
				Pieces.deselectBuyPiece();
			}
			
			if(selectedPieceID)
			{
				switch(abilityName)
				{
					case "ability_melee_attack":
						if(pieceID)
						{
							// assume it's attack
							Abilities.abilityMeleeAttackPiece(selectedPieceID, pieceID);
							
							// deselect at the end of day
							Pieces.deselectPiece();
							Abilities.deselectAbility();
						}
						break;
					case "ability_move":
					default:
						// else, assume it's movement
						Abilities.abilityMovePiece(selectedPieceID, positionIndex);
						// deselect at the end of day
						Pieces.deselectPiece();
						Abilities.deselectAbility();
						break;
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
		},
		
		/* DEBUG */
		debugDrawTileText: function(context, tilePosition, text)
		{	
			let positionCartesian = Board.calculateCartesianFromIndex(tilePosition);
			let canvasPosition = GUI.cartesianToCanvas(positionCartesian.x, positionCartesian.y);
			
			context.fillText(text, canvasPosition.x + tileSize/2, canvasPosition.y + (tileSize)/2+(fontSize)/2);
		},
		
		cartesianToCanvas: function(x, y)
		{
			let canvasX = offsetX+(tileSize+TILE_MARGIN)*x;
			let canvasY = offsetY+(tileSize+TILE_MARGIN)*y;
			
			return {x: canvasX, y: canvasY};
		},
		
		/*
			Valid coordinates ARE NOT GUARANTEED.
		 */
		canvasToCartesian: function(x, y)
		{
			// god forbid you round, cause that's not how indices work
			let cartesianX = Math.floor((x - offsetX)/(tileSize + TILE_MARGIN));
			let cartesianY = Math.floor((y - offsetY)/(tileSize + TILE_MARGIN));
			
			return {x: cartesianX, y: cartesianY};
		},
		
		keyCodeToKeyName: function(keyCode)
		{
			switch(keyCode)
			{
				case 37:
				case 65:
					return "left";
					break;
				case 39:
				case 68:
					return "right";
					break;
				case 40:
				case 83:
					return "down";
					break;
				case 38:
				case 87:
					return "up";
					break;
			}
		},
		
		panBoardX: function(x)
		{
			// TODO TODO: fix how it is SOOO SLOW.
			if(!x) return; // 0 doesn't matter anyways
			offsetX += x;
			// EVERYTHING changes x and y position
			GUI.updateAll();
		},
		
		panBoardY: function(y)
		{
			if(!y) return; // 0 doesn't matter anyways
			offsetY += y;
			// EVERYTHING changes x and y position
			GUI.updateAll();
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
		
		updateUI: function()
		{
			UILayer.update();
		},
		
		updateAll: function()
		{
			mapLayer.update();
			unitsLayer.update();
			effectsLayer.update();
			UILayer.update();
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
				GUI.onTileClick(positionIndex);
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
		
		handleKeydown: function(event)
		{
			let keyName = GUI.keyCodeToKeyName(event.keyCode);
			keysPressed[keyName] = true;
		},
		
		handleKeyup: function(event)
		{
			let keyName = GUI.keyCodeToKeyName(event.keyCode);
			keysPressed[keyName] = false;
		},
	};
})();