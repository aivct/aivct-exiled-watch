/*
	At present, a glorified namespace for different canvas layers.
	
	This should be closely coupled with the Game module, and nothing else.
	
	GUI functions should not throw errors. If something is weird, at most, log it. Glitches are fine.
	
	It has two jobs: 
		- translate data into pixels
		- and translate pixels back into data.
		
	TODO: cull drawing if not visible (if bounding box is outside of view, ex).
	TODO: max scroll outside
 */
const GUI = (function()
{
	const DEFAULT_PARTICLE_LIFESPAN = 2000;
	const TILE_MARGIN = 5;
	const VISIBLE_MARGIN = 100;
	
	var GUIContainer;
	var unitBuyerElement;
	var abilityToolbarElement;
	var endTurnButtonElement;
	var tooltipElement;
	
	var unitDesignerElement;
	var equipmentListElement;
	var equipmentViewerElement;
	var statisticsArmorElement;
	
	var canvasPanel;
	var mapLayer;
	var unitsLayer;
	var effectsLayer;
	var UILayer;
	
	// TODO: move effects to UI and add particles + particle combination
	
	// TODO: implement resizing
	var containerWidth = 800;
	var containerHeight = 600;
	
	var canvasWidth = 600;
	var canvasHeight = 600;
	
	// Square font should be in multiples of 6, though font height is 5, due to odd quirks in generation
	var fontFamily = "Square-Font";
	var fontSize = 18;
	// TODO: zoom
	const sizeMultiplier = 1; // NOT zoom, but a static multiplier to draw size.
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
			GUIContainer = document.createElement("div");
			GUIContainer.style.width = `${containerWidth}px`;
			GUIContainer.style.height = `${containerHeight}px`;
			GUIContainer.classList.add("gui-container");
			GUIContainer.style.position = "relative";
			
			// create the main canvas
			canvasPanel = new BPanel(600,600);
			GUIContainer.appendChild(canvasPanel.getElement());
			canvasPanel.getElement().style.position = "absolute";
			canvasPanel.getElement().style.left = "200px";
			canvasPanel.getElement().style.top = "0";
			canvasPanel.setBorderImage(Assets.getImage("border_600x600"));
			
			// TODO: move all events from document to canvas container
			canvasPanel.getElement().addEventListener("pointerdown",GUI.handlePointerdown, false);
			canvasPanel.getElement().addEventListener("pointerup",GUI.handlePointerup, false);
			canvasPanel.getElement().addEventListener("pointermove",GUI.handlePointermove, false);
			document.body.addEventListener("keydown",GUI.handleKeydown, false);
			document.body.addEventListener("keyup",GUI.handleKeyup, false);
			
			
			mapLayer = GUI.createMapLayer();
			canvasPanel.appendChild(mapLayer.getCanvas());
			UILayer = GUI.createUILayer();
			canvasPanel.appendChild(UILayer.getCanvas());
			unitsLayer = GUI.createUnitsLayer();
			canvasPanel.appendChild(unitsLayer.getCanvas());
			effectsLayer = GUI.createEffectsLayer();
			canvasPanel.appendChild(effectsLayer.getCanvas());
			
			// DOM elements 
			//unitBuyerElement = GUI.createUnitBuyerElement();
			//GUIContainer.appendChild(unitBuyerElement);
			
			abilityToolbarElement = GUI.createAbilityToolbarElement();
			endTurnButtonElement = GUI.createEndTurnButtonElement();
			
			unitDesignerElement = GUI.createUnitDesignerElement();
			GUIContainer.appendChild(unitDesignerElement);
			unitDesignerElement.style.display = "none";
			
			tooltipElement = GUI.createTooltipElement();
			GUIContainer.appendChild(tooltipElement);
			tooltipElement.style.display = "none";
			tooltipElement.style.zIndex = "999"; // tooltips above all

			let toolbarPanel = new BPanel(200,600);
			GUIContainer.appendChild(toolbarPanel.getElement());
			toolbarPanel.setBorderImage(Assets.getImage("border_200x600"));
			
			toolbarPanel.appendChild(abilityToolbarElement);
			toolbarPanel.appendChild(endTurnButtonElement);
			
			// TEST
			//Assets.getImage("spearman").recolor([255,255,255]);
			
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
			
			
			
			element.onmouseover = (event) => 
			{
				let tooltipContent = document.createElement("div");
				tooltipContent.innerHTML = `<h1>${Localization.getString(ability?.abilityName)}</h1><p>${Localization.getString(ability?.abilityName+'_desc')}</p>`;
				
				let elementBounds = element.getBoundingClientRect();
				let clientX = elementBounds.left;
				let clientY = elementBounds.top;
				let width = elementBounds.width;
				let height = elementBounds.height;
				console.log(elementBounds);
				GUI.setTooltip(tooltipContent, clientX + width , clientY);
			};
			
			element.onmouseleave = (event) => { GUI.hideTooltip() };
			
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
			let element = document.createElement("div");
			element.style.position = "absolute";
			element.style.top = "0";
			element.style.left = "0";
			element.classList.add("gui-element");
			
			return element;
		},
		
		createEndTurnButtonElement: function()
		{
			let element = document.createElement("div");
			element.style.position = "absolute";
			element.style.top = "0";
			element.style.right = "0";
			element.classList.add("gui-element");
			element.classList.add("button");
			// TODO: remember there are other end turns as well...
			element.onclick = () => { Pieces.endTurn() };
			
			let header = document.createElement("h1");
			let textNode = document.createTextNode("END TURN");
			header.appendChild(textNode);
			element.appendChild(header);
			
			return element;
		},
		
		createUnitDesignerElement: function()
		{
			let element = document.createElement("div");
			element.style.position = "absolute";
			element.style.top = "50px";
			element.style.left = "100px";
			element.style.width = "600px";
			element.style.height = "500px";
			element.classList.add("gui-element");
			
			// equipment viewer 
			element.appendChild(GUI.createUnitDesignerEquipmentElement());
				// tooltip for each listitem
			
			// stats viewer
			element.appendChild(GUI.createUnitDesignerStatisticsElement());
			
			return element;
		},
		
		createUnitDesignerEquipmentElement: function()
		{
			let element = document.createElement("div");
			element.classList.add("horizontal");
			
			let header = document.createElement("h1");
			let textNode = document.createTextNode("EQUIPMENT");
			header.appendChild(textNode);
			element.appendChild(header);
			
			// equipment list
			equipmentListElement = document.createElement("div");
			equipmentListElement.style.height = "200px";
			equipmentListElement.style.width = "200px";
			equipmentListElement.style.overflow = "auto";
			element.appendChild(equipmentListElement);
			
			// equipment viewer
			equipmentViewerElement = document.createElement("div");
			equipmentViewerElement.style.height = "200px";
			equipmentViewerElement.style.width = "200px";
			equipmentViewerElement.style.overflow = "auto";
			let buyableEquipment = Equipment.getEquipmentStatistics();
			for(let equipmentKey in buyableEquipment)
			{
				let equipment = buyableEquipment[equipmentKey];
				let equipmentName = Equipment.getEquipmentDisplayName(equipmentKey);
				
				let itemElement = document.createElement("div");
				
				let addEquipmentButton = document.createElement("div");
				addEquipmentButton.classList.add(`horizontal`);
				addEquipmentButton.classList.add(`gui-square-button`);
				addEquipmentButton.style.width = `16px`;
				addEquipmentButton.style.height = `16px`;
				addEquipmentButton.innerHTML = `+`;
				addEquipmentButton.onclick = () => { Soldiers.addUnitDesignerEquipment(equipmentKey) };
				itemElement.appendChild(addEquipmentButton);
				
				let itemText = document.createElement("p");
				itemText.classList.add(`horizontal`);
				let textNode = document.createTextNode(equipmentName);
				itemText.appendChild(textNode);
				
				itemElement.appendChild(itemText);
				
				equipmentViewerElement.appendChild(itemElement);
			}
			element.appendChild(equipmentViewerElement);
			
			return element;
		},
		
		createUnitDesignerStatisticsElement: function()
		{
			let element = document.createElement("div");
			element.classList.add("horizontal");
			
			let header = document.createElement("h1");
			let textNode = document.createTextNode("STATISTICS");
			header.appendChild(textNode);
			element.appendChild(header);
			
			// armor
			statisticsArmorElement = document.createElement("div");
			statisticsArmorElement.style.height = "200px";
			statisticsArmorElement.style.width = "200px";
			statisticsArmorElement.style.overflow = "auto";
			let armorStatistics = Soldiers.getUnitDesignerArmorCoverage();
			for(let coverageKey in armorStatistics)
			{
				let itemElement = document.createElement("div");
				itemElement.innerHTML = `${Localization.getString(coverageKey)}: ${0}`;
				statisticsArmorElement.appendChild(itemElement);
			}
			
			element.appendChild(statisticsArmorElement);
			
			return element;
		},
		
		updateUnitDesigner: function()
		{
			// update equipment list
			equipmentListElement.innerHTML = ``;
			let unitDesignerEquipment = Soldiers.getUnitDesignerEquipment();
			for(let equipmentKey in unitDesignerEquipment)
			{
				let equipment = unitDesignerEquipment[equipmentKey];
				let equipmentName = Equipment.getEquipmentDisplayName(equipment);
				
				let itemElement = document.createElement("div");
				
				let addEquipmentButton = document.createElement("div");
				addEquipmentButton.classList.add(`horizontal`);
				addEquipmentButton.classList.add(`gui-square-button`);
				addEquipmentButton.style.width = `16px`;
				addEquipmentButton.style.height = `16px`;
				addEquipmentButton.innerHTML = `-`;
				addEquipmentButton.onclick = () => { Soldiers.removeUnitDesignerEquipment(equipment) };
				itemElement.appendChild(addEquipmentButton);
				
				let itemText = document.createElement("p");
				itemText.classList.add(`horizontal`);
				let textNode = document.createTextNode(equipmentName);
				itemText.appendChild(textNode);
				
				itemElement.appendChild(itemText);
				
				equipmentListElement.appendChild(itemElement);
			}
			
			// update statistics
			statisticsArmorElement.innerHTML = ``;
			let armorStatistics = Soldiers.getUnitDesignerArmorCoverage();
			for(let coverageKey in armorStatistics)
			{
				let text = `${Localization.getString(coverageKey)}: ${Math.round(armorStatistics[coverageKey])}`
				let itemElement = document.createElement("div");
				itemElement.innerHTML = text;
				statisticsArmorElement.appendChild(itemElement);
			}
		},
		
		setTooltip: function(element, x, y)
		{
			tooltipElement.style.display = `block`;
			
			tooltipElement.style.left = `${x}px`;
			tooltipElement.style.top = `${y}px`;
			tooltipElement.innerHTML = ``;
			tooltipElement.appendChild(element);
		},
		
		hideTooltip: function()
		{
			tooltipElement.style.display = `none`;
		},
		/*
		updateAbilityToolbarSelected: function()
		{
			
		},
		
		clearAbilityToolbarSelected: function()
		{
			
		},
		 */
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
				GUI.panBoardX(delta);
			}
			if(keysPressed["right"])
			{
				GUI.panBoardX(-delta);
			}
			if(keysPressed["up"])
			{
				GUI.panBoardY(delta);
			}
			if(keysPressed["down"])
			{
				GUI.panBoardY(-delta);
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
			
			// draw depending on its HP, most likely temp for now
			let ID = unit?.ID;
			if(!ID) return;
			//let drawSettings = Pieces.getPieceTypePropertyByID(ID, "drawSettings");
			
			// draw underlying base for unit cause I'm too lazy to write a recolor function right now.
			let team = unit?.team;
			let teamColour = "blue";
			if(team === 2)
			{
				teamColour = "#fe01d4";
			}
			context.fillStyle = teamColour;
			context.beginPath();
			context.fillRect(canvasPosition.x+2, canvasPosition.y+2, tileSize-4, tileSize-4);
			
			let spritesToDraw = Pieces.getPieceSoldierSpritesByID(ID);
			let width = 6;
			let height = 6;
			let rowWidth = 4;
			let marginX = 3;
			let marginY = 3;
			let rowOddX = 1;
			
			for(let index = 0; index < spritesToDraw.length; index++)
			{
				let rowCount = Math.floor(index / rowWidth);
				if(rowCount === 0) context.globalAlpha = 1;
				if(rowCount === 1) context.globalAlpha = 0.66;
				if(rowCount === 2) context.globalAlpha = 0.50;
				if(rowCount === 3) context.globalAlpha = 0.33;
				
				let sprite = spritesToDraw[index];
				if(!sprite) continue;
				
				sprite.draw(context
					, canvasPosition.x + tileSize - marginX - width * (index % rowWidth) * sizeMultiplier - (sprite.getWidth() * sizeMultiplier) - ((rowCount % 2) * rowOddX * sizeMultiplier)
					, canvasPosition.y + tileSize - marginY - height * (rowCount) * sizeMultiplier - (sprite.getHeight() * sizeMultiplier)
					, (sprite.getWidth() * sizeMultiplier)
					, (sprite.getHeight() * sizeMultiplier) );
			}
			context.globalAlpha = 1;
			
			// XP indicator
			/*
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
			 */
			 /*
			// movement indicator
			let movementBarRatio = Pieces.getPieceMovementByID(ID) / Pieces.getPieceMaxMovementByID(ID);
			
			context.fillStyle = "#009900";
			context.fillRect(canvasPosition.x, canvasPosition.y + tileSize, tileSize, 3);
			
			context.fillStyle = "#00FF00";
			context.fillRect(canvasPosition.x, canvasPosition.y + tileSize, tileSize * movementBarRatio, 2);
			*/
			// AP indicator
			let APBarRatio = Pieces.getPieceAPByID(ID) / Pieces.getPieceMaxAPByID(ID);
			
			context.fillStyle = "#9E8B00";
			context.fillRect(canvasPosition.x, canvasPosition.y + tileSize, tileSize, 3);
			
			context.fillStyle = "#FAFF00";
			context.fillRect(canvasPosition.x, canvasPosition.y + tileSize, tileSize * APBarRatio, 2);
			
			// HP Bars, one big bar instead
			let soldiers = Pieces.getPieceSoldiersIDByID(ID);
			let totalHP = 0;
			let totalMaxHP = 0;
			for(let index = 0; index < soldiers.length; index++)
			{
				let soldierID = soldiers[index];
				totalHP += Soldiers.getSoldierHPByID(soldierID);
				totalMaxHP += Soldiers.getSoldierMaxHPByID(soldierID);
				
				/*
				let HPBarRatio = Soldiers.getSoldierHPByID(soldierID) / Soldiers.getSoldierMaxHPByID(soldierID);
				
				let barSize = (tileSize / soldiers.length) - 1;
				let leftX = (barSize + 1) * index;
				
				context.fillStyle = "#7b0404";
				context.fillRect(canvasPosition.x + leftX, canvasPosition.y + tileSize - 4, barSize, 3);
				
				context.fillStyle = "red";
				context.fillRect(canvasPosition.x + leftX, canvasPosition.y + tileSize - 4, barSize * HPBarRatio, 2);
				*/
			}
			let HPBarRatio = totalHP / totalMaxHP; // TODO: maxHP should be totalINITIALMaxHP
			
			context.fillStyle = "#7b0404";
			context.fillRect(canvasPosition.x, canvasPosition.y + tileSize - 4, tileSize, 3);
			
			context.fillStyle = "red";
			context.fillRect(canvasPosition.x, canvasPosition.y + tileSize - 4, tileSize * HPBarRatio, 2);
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
				
				let text = `${particle.data.toFixed()}`;
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
				// TODO: change merging to be only from the same source (don't care hpw far)
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
		// we can be really wasteful here, since it's UI that's VERY rarely updated.
		drawUI: function(context, canvas)
		{
			context.clearRect(0,0,canvas.width,canvas.height);
			
			let font = `${fontSize}px ${fontFamily}`;
			if(context.font !== font) context.font = font;
			
			let selectedPieceID = Pieces.getSelectedPiece();
			if(selectedPieceID)
			{
				
				// highlight selected in green
				let selectedPiecePosition = Pieces.getPiecePositionByID(selectedPieceID);
				context.strokeStyle = "#01fe4d";
				context.lineWidth = 2;
				GUI.drawHighlightedTile(context, selectedPiecePosition);
				
				let abilityName = Abilities.getSelectedAbility();
				// draw attack map but ONLY if there is AP left
				let selectedPieceAP = Pieces.getPieceAPByID(selectedPieceID);
				let validTargetsID;
				switch(abilityName)
				{
					case "ability_ranged_attack":
						let selectedPieceRange = Pieces.getPieceMaxRangeByID(selectedPieceID);
						let isRanged = Pieces.isPieceRangedByID(selectedPieceID);
						if(!isRanged) break;
						if(abilityName === "ability_ranged_attack")validTargetsID = Pieces.getValidTargetsID(selectedPieceID, selectedPieceRange, "attack");
						// TODO: highlight all possible range in red
					case "ability_melee_attack":
						if(abilityName === "ability_melee_attack") validTargetsID = Pieces.getValidTargetsID(selectedPieceID, 1, "attack");
						if(selectedPieceAP > 0)
						{
							
							context.strokeStyle = "red";
							for(let targetCount = 0; targetCount < validTargetsID.length; targetCount++)
							{
								let targetID = validTargetsID[targetCount];
								let targetPosition = Pieces.getPiecePositionByID(targetID);
								
								GUI.drawHighlightedTile(context, targetPosition);
							}
						}
						break;
					case "ability_move":
					default:
						if(selectedPieceAP > 0)
						{
							// draw movement map
							let movementMap = Pieces.getValidMovementMap(selectedPieceID);
							//let movementMap = Board.calculateTilePathfindingDistanceMapByIndex(Pieces.getPiecePositionByID(selectedPieceID), -1);
							//let movementMap = Board.findPathByIndex(Pieces.getPiecePositionByID(selectedPieceID), 0);
							context.strokeStyle = "blue";
							context.fillStyle = "blue";
							for(var tileIndex in movementMap)
							{
								GUI.drawHighlightedTile(context, tileIndex);
								GUI.debugDrawTileText(context, tileIndex, movementMap[tileIndex]);
							}
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
			let selectedPieceID = Pieces.getSelectedPiece();
			let pieceID = Board.getTilePieceOccupiedIndex(positionIndex);
			
			if(selectedPieceID)
			{
				switch(abilityName)
				{
					case "ability_ranged_attack":
						if(pieceID)
						{
							Abilities.abilityRangedAttackPiece(selectedPieceID, pieceID);
						}
						break;
					case "ability_melee_attack":
						if(pieceID)
						{
							Abilities.abilityMeleeAttackPiece(selectedPieceID, pieceID);							
						}
						break;
					case "ability_move":
					default:
						// else, assume it's movement
						Abilities.abilityMovePiece(selectedPieceID, positionIndex);
						break;
				}
				
				// deselect at the end of day
				Pieces.deselectPiece();
				Abilities.deselectAbility();
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
		
		keyToKeyName: function(key)
		{
			switch(key)
			{
				case "1":
					return "1";
					break;
				case "2":
					return "2";
					break;
				case "3":
					return "3";
					break;
				case "4":
					return "4";
					break;
				case "ArrowLeft":
					return "left";
					break;
				case "ArrowRight":
					return "right";
					break;
				case "ArrowDown":
					return "down";
					break;
				case "ArrowUp":
					return "up";
					break;
			}
		},
		
		panBoardX: function(x)
		{
			// TODO: fix how it is SOOO SLOW.
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
			let bounds = canvasPanel.getElement().getBoundingClientRect();
	
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
			let bounds = canvasPanel.getElement().getBoundingClientRect();
	
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
			let bounds = canvasPanel.getElement().getBoundingClientRect();
	
			var pointerX = event.clientX - bounds.x;
			var pointerY = event.clientY - bounds.y;
			
			let positionCartesian = GUI.canvasToCartesian(pointerX, pointerY);
			if(!Board.isValidCartesian(positionCartesian.x, positionCartesian.y)) return;
			let positionIndex = Board.calculateIndexFromCartesian(positionCartesian.x, positionCartesian.y);
		},
		
		handleKeydown: function(event)
		{
			let keyName = GUI.keyToKeyName(event.key);
			keysPressed[keyName] = true;
			
			GUI.onKeyPressed(keyName);
		},
		
		onKeyPressed: function(key)
		{
			// TODO: refactor hotkeys to be dynamic instead of hardcoded
			switch(key)
			{
				case "1":
					Abilities.setSelectedAbility("ability_move");
					break;
				case "2":
					Abilities.setSelectedAbility("ability_melee_attack");
					break;
				case "3":
					Abilities.setSelectedAbility("ability_ranged_attack");
					break;
				default:
					break;
			}
		},
		
		handleKeyup: function(event)
		{
			let keyName = GUI.keyToKeyName(event.key);
			keysPressed[keyName] = false;
		},
		
	};
})();