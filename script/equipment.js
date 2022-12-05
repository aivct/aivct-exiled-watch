/*
	Equipment:
	An integer. Stats are quite hardcoded.
	
	TODO: add artifacts
 */
const Equipment = (function()
{
	const equipmentStatistics = {
		/* Shields */
		"round_shield": {
			"localization_string": "equipment_round_shield",
			"type": "shield",
			"weight": 10,
			"block": 15,
		},
		"tower_shield": {
			"localization_string": "equipment_tower_shield",
			"type": "shield",
			"weight": 30,
			"block": 40,
		},
		
		/* Armor */
		"tunic": {
			"localization_string": "equipment_tunic",
			"type": "armor",
			"armor_type": "shirt",
			"weight": 2,
			"armor": 1,
		},
		"gambeson": {
			"localization_string": "equipment_gambeson",
			"type": "armor",
			"armor_type": "shirt",
			"weight": 10,
			"armor": 8,
		},
		"mail_shirt": {
			"localization_string": "equipment_mail_shirt",
			"type": "armor",
			"armor_type": "shirt",
			"weight": 16,
			"armor": 16,
		},
		"plate_armor": {
			"localization_string": "equipment_plate_armor",
			"type": "armor",
			"armor_type": "full_plate",
			"weight": 46,
			"armor": 34,
		},
		
		/* Weapons */
		"dagger": {
			"localization_string": "equipment_dagger",
			"type": "weapon",
			"weight": 3,
			"damage_type": "pierce",
			"min_damage": 10,
			"max_damage": 15,
		},
		"shortsword": {
			"localization_string": "equipment_shortsword",
			"type": "weapon",
			"weight": 6,
			"damage_type": "slash",
			"min_damage": 25,
			"max_damage": 35,
		},
		"longsword": {
			"localization_string": "equipment_longsword",
			"type": "weapon",
			"weight": 10,
			"damage_type": "slash",
			"min_damage": 40,
			"max_damage": 55,
		},
		"simple_spear": {
			"localization_string": "equipment_simple_spear",
			"type": "weapon",
			"weight": 3,
			"damage_type": "pierce",
			"min_damage": 20,
			"max_damage": 25,
		},
		"mace": {
			"localization_string": "equipment_mace",
			"type": "weapon",
			"weight": 8,
			"damage_type": "blunt",
			"min_damage": 25,
			"max_damage": 30,
		},
		
		"crossbow": {
			"localization_string": "equipment_crossbow",
			"type": "weapon",
			"isRanged": true,
			"weight": 8,
			"range": 4,
			"damage_type": "pierce",
			"min_damage": 40,
			"max_damage": 50,
			"accuracy_bonus": 10,
		},
		
		/* Mounts */
		"pony": {
			"localization_string": "equipment_pony",
			"type": "mount",
			"weight": 0, // we'll need to further refine the weight system. it should be negative (but also not)
			"movement": 5, // clamp movement to THIS instead, minus penalities of course
		},
		
		"horse": {
			"localization_string": "equipment_horse",
			"type": "mount",
			"weight": 0, 
			"movement": 6, 
		},
	}
	
	const ArmorTypesStatistics = {
		"shirt": {
			"chest":100,
			"groin":20,
			"arms":20,
		},
		"full_plate": {
			"chest":100,
			"groin":100,
			"arms":100,
			"legs":100,
		},
	}
	
	return {
		initialize: function()
		{
			let equipment = Game.getState("equipment");
			for(let equipmentKey in equipmentStatistics)
			{
				equipment[equipmentKey] = 0;
			}
		},
		
		/* Getters */
		
		getEquipmentStatisticByKey: function(equipmentKey, statisticName)
		{
			let statistic = equipmentStatistics[equipmentKey];
			if(!statistic)
			{
				console.warn(`Equipment.getEquipmentStatisticByKey: cannot find key "${equipmentKey}".`);
				return null;
			}
			
			return statistic[statisticName];
		},
		
		getEquipmentWeightByKey: function(equipmentKey)
		{
			return Equipment.getEquipmentStatisticByKey(equipmentKey, "weight");
		},
		
		getEquipmentArmorByKey: function(equipmentKey)
		{
			return Equipment.getEquipmentStatisticByKey(equipmentKey, "armor");
		},
		
		getEquipmentArmorTypeByKey: function(equipmentKey)
		{
			return Equipment.getEquipmentStatisticByKey(equipmentKey, "armor_type");
		},
		
		isWeaponRangedByKey: function(equipmentKey)
		{
			// undefined should NOT be a valid falsy value. so use an explicit false instead.
			let isRanged = Equipment.getEquipmentStatisticByKey(equipmentKey, "isRanged");
			if(isRanged === undefined) isRanged = false;
			return isRanged;
		},
		
		getWeaponRangeByKey: function(equipmentKey)
		{
			return Equipment.getEquipmentStatisticByKey(equipmentKey, "range");
		},
		
		getWeaponAccuracyBonus: function(equipmentKey)
		{
			return Equipment.getEquipmentStatisticByKey(equipmentKey, "accuracy");
		},
		
		getMountMovementByKey: function(equipmentKey)
		{
			return Equipment.getEquipmentStatisticByKey(equipmentKey, "movement");
		},
		
		getEquipmentMinDamageByKey: function(equipmentKey)
		{
			return Equipment.getEquipmentStatisticByKey(equipmentKey, "min_damage");
		},
		
		getEquipmentMaxDamageByKey: function(equipmentKey)
		{
			return Equipment.getEquipmentStatisticByKey(equipmentKey, "max_damage");
		},
		
		getEquipmentDamageTypeByKey: function(equipmentKey)
		{
			return Equipment.getEquipmentStatisticByKey(equipmentKey, "damage_type");
		},
		
		getEquipmentTypeByKey: function(equipmentKey)
		{
			return Equipment.getEquipmentStatisticByKey(equipmentKey, "type");
		},
		
		getEquipmentArmorCoverageByKey: function(equipmentKey, bodyPart)
		{
			let armorType = Equipment.getEquipmentArmorTypeByKey(equipmentKey);
			let armorCoverages = ArmorTypesStatistics[armorType];
			if(!armorCoverages)
			{
				console.warn(`Equipment.getEquipmentArmorCoverageByKey: cannot find armor type "${armorType}".`);
				return;
			}
			armorCoverage = armorCoverages[bodyPart];
			if(armorCoverage === undefined) armorCoverage = 0;
			return armorCoverage;
		},
		
		getEquipmentCountByKey: function(equipmentKey)
		{
			return Game.getState("equipment", equipmentKey);
		},
		
		addEquipmentCountByKey: function(equipmentKey, count)
		{
			if(count <= 0)
			{
				console.warn(`Equipment.addEquipmentCount: invalid value, count "${count}" is less than 0.`);
				return false;
			}
			
			let oldCount = Game.getState("equipment", equipmentKey);
			let newCount = oldCount + count;
			
			Game.setState("equipment", equipmentKey, newCount);
		},
		
		removeEquipmentCountByKey: function(equipmentKey, count)
		{
			if(count <= 0)
			{
				console.warn(`Equipment.removeEquipmentCount: invalid value, count "${count}" is less than 0.`);
				return false;
			}
			
			let oldCount = Game.getState("equipment", equipmentKey);
			let newCount = oldCount - count;
			
			if(newCount < 0)
			{
				console.warn(`Equipment.removeEquipmentCount: invalid value, newCount "${newCount}" is less than 0. Resetting to 0 and continuing.`);
				newCount = 0;
			}
			
			Game.setState("equipment", equipmentKey, newCount);
		},
		
		/* GUI */
		getEquipmentDisplayName: function(equipmentKey)
		{
			let stringKey = Equipment.getEquipmentStatisticByKey(equipmentKey, "localization_string");
			if(!equipmentKey)
			{
				console.warn(`Equipment.getEquipmentDisplayName: localization_string not found for "${equipmentKey}".`);
				return equipmentKey; // reflect param back, because we always should return SOME string.
			}
			return Localization.getString(stringKey);
		},
	}
})();
