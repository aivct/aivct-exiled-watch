/*
	A god object that shall contain all of the data.
	
	Data should be primitives, or object primitives, for easier saving and loading. 
	- Use helper functions instead of prototypes.
	- Try not to have arrays within arrays and objects within objects, 
		though it is not a hard and fast rule, this should help preserve data integrity down the road.
	- References are NOT allowed. Instead, use IDs.
		ie, tile.unitOccupied = unitID; unit.tilePosition = tileIndex;
	
	We are effectively reinventing the wheel for databases, 
		but that's what they are for in data-oriented design, 
		which is more suited for game programming than OOP.
 */
var Game = (function()
{
	var state;
	
	return {
		initialize: function()
		{
			state = {};
			// initialize categories 
			state["system"] = {};
			state["system"].version = VERSION;
			state["map"] = {};
			state["settings"] = {};
			state["settings"].particlesEnabled = true;
			
			state["metrics"] = {};
			Metrics.initialize();
			
			// id'ed objects
			state["pieces"] = [];
			state["soldiers"] = [];
			state["ID"] = {}; // list of lastIDs
			// TODO: if no ID is found, search from parent category for lastID. 
			// And if THAT still doesn't work, then assign default 1000.
			 
			//TODO: onload and validation after that...
			//GUI.updateMap();
		},
		
		newGame: function()
		{
			state["ID"]["pieces"] = 1000;
			state["ID"]["soldiers"] = 1000;
			Board.createMap();
			Pieces.newGame();
			
			GUI.updateAll();
		},
		
		/*
			Responsive addition.
			ie, if the property an int, it'll add an int, while if the property is an array, it'll push the new value.
		 */
		addState: function(category, property, value)
		{
			if(!state[category])
			{
				console.warn(`Game.addState: No such category "${category}".`);
				return;
			}
			let type = typeof state[category][property];
			
			if(type === typeof [])
			{
				state[category][property].push(value);
			}
			else 
			{
				state[category][property] += value;
			}
		},
		
		setState: function(category, property, value)
		{
			if(!state[category])
			{
				console.warn(`Game.setState: No such category "${category}".`);
				return;
			}
			
			state[category][property] = value;
		},
		
		getState: function(category, property)
		{
			if(!state[category])
			{
				console.warn(`Game.getState: No such category "${category}".`);
				return;
			}
			
			// if property isn't specified, assume we want the category instead, 
			// which fear not, is only because it is demanded by certain rendering functions.
			if(!property) return state[category];
			
			return state[category][property];
		},
		
		importState: function(dataString)
		{
			state = JSON.parse(dataString);
			// do some validation... eventually
			
			// obviously we'll have to update everything
			GUI.updateAll();
		},
		
		exportState: function()
		{
			return JSON.stringify(state);
		},
		
		/*
			We flatten ID objects into their own category, 
				and store their IDs in a hardcoded category,
			Because we do not want too many parameters
		 */
		getIDObject: function(category, ID)
		{
			let objectArray = state[category];
			if(!objectArray)
			{
				console.warn(`Game.getIDObject: No such category "${category}"`);
				return; // a wrong category is a different kind of error than a wrong ID. we return a different value (undefined) for easier debugging.
			}
			
			for(var index = 0; index < objectArray.length; index++)
			{
				let object = objectArray[index];
				if(object.ID === ID) return object;
			}
			return null;
		},
		
		getIDObjectProperty: function(category, ID, property)
		{
			let object = Game.getIDObject(category, ID);
			if(!object) return;
			return object[property];
		},
		
		/*
			General flow to creating a new object:
				factory function creates an object except for its ID
					most likely, it's going to be a specific of a generic, ie
						() => {return createGeneric(param1, param2...);};
				object is assigned an ID and automatically added to state to guarantee integrity
			ie,
				let createSpearman = () => {return createPiece("spearman")};
				Game.createNewIDObject("pieces", createSpearman);
		 */
		createNewIDObject: function(category, factory)
		{
			let objectArray = state[category];
			if(!objectArray)
			{
				console.warn(`Game.addIDObject: No such category "${category}"`);
				return;
			}
			let ID = ++state["ID"][category];
			let object = factory();
			object.ID = ID;
			
			return Game.addIDObject(category, object);
		},
		
		// use sparingly, this ought to be an internal function. use the provided createNewIDObject factory function instead
		addIDObject: function(category, object)
		{
			let objectArray = state[category];
			if(!objectArray)
			{
				console.warn(`Game.addIDObject: No such category "${category}"`);
				return;
			}
			// if ID already exists, that's a big problem. It means ID integrity has been lost.
			let ID = object.ID;
			if(Game.getIDObject(category, ID) !== null)
			{
				console.warn(`Game.addIDObject: ID "${ID}" already exists for category "${category}".`);
				return;
			}
			// if all is clear, then it's probably fine
			objectArray.push(object);
			return object;
		},
		
		// use sparingly; a 'isDead' pattern is better to prevent old references from being made invalid. most likely used when pruning.
		removeIDObject: function(category, ID)
		{
			let objectArray = state[category];
			if(!objectArray)
			{
				console.warn(`Game.removeIDObject: No such category "${category}"`);
				return;
			}
			return removeObjectInArrayByProperty(objectArray, "ID", ID);
		},
		
		// shorthand for getting an object by ID and modifying its property
		setIDObjectProperty: function(category, ID, property, value)
		{
			let object = Game.getIDObject(category, ID);
			if(!object) return false;
			
			object[property] = value;
			// put trigger listeners here (since we only care if something HAS changed)
			return true;
		},			
		
		// shorthand for getting an object by ID and using the + operator on it. 
		changeIDObjectProperty: function(category, ID, property, delta)
		{
			let object = Game.getIDObject(category, ID);
			if(!object) return false;
			
			object[property] += delta;
			// put trigger listeners here (since we only care if something HAS changed)
			return true;
		},
	};
})();

var Metrics = (function()
{
	return {
		initialize: function()
		{
			Game.setState("metrics","formations_lost",0);
			Game.setState("metrics","formations_killed",0);
			Game.setState("metrics","damage_dealt",0);
			Game.setState("metrics","damage_received",0);
			Game.setState("metrics","health_healed",0);
			Game.setState("metrics","gold_spent",0);
			Game.setState("metrics","xp_earned",0);
			Game.setState("metrics","turns_played",0);
			Game.setState("metrics","tiles_moved",0);
			Game.setState("metrics","ap_spent",0);
		},
		
		addMetric: function(name, value)
		{
			let previousValue = Game.getState("metrics",name);
			if(!Game.getState("metrics",name) && Game.getState("metrics",name) !== 0)
			{
				console.warn(`Metrics.addMetric: metric "${name}" returned "${previousValue}". Resetting to 0.`);
				Game.setState("metrics",name,0);
			}
			if(!value && value !== 0)
			{
				console.warn(`Metrics.addMetric: invalid valid "${value}".`);
				return;
			}
			return Game.addState("metrics",name,value);
		},
		
		getMetrics: function()
		{
			return Game.getState("metrics");
		},
	}
})();