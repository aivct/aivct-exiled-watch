const Localization = (function()
{
	/*
		Guideline for descriptions and flavor text:
		1. Spelling should be common american english for sake of consistency.
		2. Flavor text should give new players an idea of what's going on. 
			It should read like a wikipedia answer to "What is ${X}" 
			plus, IF RELEVANT, some flavor from in-game for worldbuilding.
			plus some info on its use case.
			Don't go overboard with the flavor.
		ie, "Chainmail Shirt": "Armour made out of small interlocking metal rings. It is produced en masse in the Mountain Kingdom. It provides great slashing resistance."
		
	 */
	
	
	const STRINGS_EN_US = {
		"equipment_round_shield": "Round Shield",
		"equipment_tower_shield": "Tower Shield",
		"equipment_tunic": "Tunic",
		"equipment_gambeson": "Gambeson",
		"equipment_mail_shirt": "Mail Shirt",
		"equipment_plate_armor": "Plate Armor",
		"equipment_dagger": "Dagger",
		"equipment_shortsword": "Shortsword",
		"equipment_longsword": "Longsword",
		"equipment_simple_spear": "Simple Spear",
		"equipment_mace": "Mace",
		"equipment_crossbow": "Crossbow",
		"equipment_pony": "Pony",
		"equipment_horse": "Horse",
		
		"head": "Head",
		"chest": "Chest",
		"groin": "Groin",
		"arms": "Arms",
		"legs": "Legs",
	}
	
	return {
		getString: function(stringKey)
		{
			let string = STRINGS_EN_US[stringKey];
			if(!string)
			{
				console.warn(`Localization.getString: no localization found for string "${stringKey}".`);
				return stringKey; // always return a string of some kind.
			}
			return string;
		},
	}
})();