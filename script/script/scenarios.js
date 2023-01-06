/*
	"...The great battle in our own time." — Gandalf the White
	
	TODO: compress scene data to code instead.
	TODO: scenario editor
	
	Notes: why is it so long? so boring? so micromanage-y?
	Idea: one level above individual pieces: companies?
		Either that or we increase the # of units in individual pieces. 
	Idea 2: width 2 pieces? Ie a really LONG piece?
		https://gamedev.stackexchange.com/questions/18050/multi-tile-agent-path-finding-algorithm
	Idea 3: formation direction?
 */
const Scenarios = (function()
{
	return {
		// temp until we can reduce it to JSON.
		createScenarioBattle: function()
		{
			Game.resetState();
			
			// for now, just make it code instead.
			Board.createMap(20,20);
			Scenarios.createAndSpawnHorsemen(1, 3, 1);
			Scenarios.createAndSpawnHorsemen(1, 3, 2);
			Scenarios.createAndSpawnHorsemen(1, 3, 3);
			Scenarios.createAndSpawnHorsemen(1, 4, 1);
			Scenarios.createAndSpawnHorsemen(1, 4, 2);
			Scenarios.createAndSpawnHorsemen(1, 4, 3);
			Scenarios.createAndSpawnSpearmen(1, 4, 5);
			Scenarios.createAndSpawnSpearmen(1, 4, 6);
			Scenarios.createAndSpawnSpearmen(1, 4, 7);
			Scenarios.createAndSpawnSpearmen(1, 4, 8);
			Scenarios.createAndSpawnSpearmen(1, 4, 9);
			Scenarios.createAndSpawnSpearmen(1, 4, 10);
			Scenarios.createAndSpawnSpearmen(1, 4, 11);
			Scenarios.createAndSpawnSpearmen(1, 4, 12);
			Scenarios.createAndSpawnSpearmen(1, 4, 13);
			Scenarios.createAndSpawnSpearmen(1, 4, 14);
			Scenarios.createAndSpawnArchers(1, 6, 5);
			Scenarios.createAndSpawnArchers(1, 6, 8);
			Scenarios.createAndSpawnArchers(1, 6, 11);
			Scenarios.createAndSpawnArchers(1, 6, 14);
			
			Scenarios.createAndSpawnHorsemen(2, 16, 1);
			Scenarios.createAndSpawnHorsemen(2, 16, 2);
			Scenarios.createAndSpawnHorsemen(2, 16, 3);
			Scenarios.createAndSpawnHorsemen(2, 15, 1);
			Scenarios.createAndSpawnHorsemen(2, 15, 2);
			Scenarios.createAndSpawnHorsemen(2, 15, 3);
			Scenarios.createAndSpawnSpearmen(2, 15, 5);
			Scenarios.createAndSpawnSpearmen(2, 15, 6);
			Scenarios.createAndSpawnSpearmen(2, 15, 7);
			Scenarios.createAndSpawnSpearmen(2, 15, 8);
			Scenarios.createAndSpawnSpearmen(2, 15, 9);
			Scenarios.createAndSpawnSpearmen(2, 15, 10);
			Scenarios.createAndSpawnSpearmen(2, 15, 11);
			Scenarios.createAndSpawnSpearmen(2, 15, 12);
			Scenarios.createAndSpawnSpearmen(2, 15, 13);
			Scenarios.createAndSpawnSpearmen(2, 15, 14);
			Scenarios.createAndSpawnArchers(2, 13, 5);
			Scenarios.createAndSpawnArchers(2, 13, 8);
			Scenarios.createAndSpawnArchers(2, 13, 11);
			Scenarios.createAndSpawnArchers(2, 13, 14);
			
			GUI.updateAll();
		},
		
		createAndSpawnArchers: function(team, x, y)
		{
			Game.createNewIDObject("pieces", () => { return Pieces.createPiece(team) } );
			
			for(let index = 0; index < 12; index++)
			{
				Game.createNewIDObject("soldiers", Soldiers.createSoldierVeteran);
				Soldiers.addSoldierEquipment(Game.getState("ID", "soldiers"), "crossbow");
				Soldiers.addSoldierEquipment(Game.getState("ID", "soldiers"), "gambeson");
				Pieces.addSoldierByID(Game.getState("ID", "pieces"), Game.getState("ID", "soldiers"));
			}
			
			Pieces.movePieceByID(Game.getState("ID", "pieces"), Board.calculateIndexFromCartesian(x,y));
		},
		
		createAndSpawnSpearmen: function(team, x, y)
		{
			Game.createNewIDObject("pieces", () => { return Pieces.createPiece(team) } );
			
			for(let index = 0; index < 12; index++)
			{
				Game.createNewIDObject("soldiers", Soldiers.createSoldierVeteran);
				Soldiers.addSoldierEquipment(Game.getState("ID", "soldiers"), "simple_spear");
				Soldiers.addSoldierEquipment(Game.getState("ID", "soldiers"), "gambeson");
				Pieces.addSoldierByID(Game.getState("ID", "pieces"), Game.getState("ID", "soldiers"));
			}
			
			Pieces.movePieceByID(Game.getState("ID", "pieces"), Board.calculateIndexFromCartesian(x,y));
		},
		
		createAndSpawnHorsemen: function(team, x, y)
		{
			Game.createNewIDObject("pieces", () => { return Pieces.createPiece(team) } );
			
			for(let index = 0; index < 3; index++)
			{
				Game.createNewIDObject("soldiers", Soldiers.createSoldierVeteran);
				Soldiers.addSoldierEquipment(Game.getState("ID", "soldiers"), "pony");
				Soldiers.addSoldierEquipment(Game.getState("ID", "soldiers"), "simple_spear");
				Soldiers.addSoldierEquipment(Game.getState("ID", "soldiers"), "gambeson");
				Pieces.addSoldierByID(Game.getState("ID", "pieces"), Game.getState("ID", "soldiers"));
			}
			
			Pieces.movePieceByID(Game.getState("ID", "pieces"), Board.calculateIndexFromCartesian(x,y));
		},
	}
})();