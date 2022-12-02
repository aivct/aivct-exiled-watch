/*
	Equipment:
	An integer. Stats are quite hardcoded.
	
	TODO: add artifacts
 */
var Equipment = (function()
{
	var equipmentStatistics = {
		/* Shields */
		"round_shield": {
			"type": "shield",
			"weight": 10,
			"block": 15,
		},
		"tower_shield": {
			"type": "shield",
			"weight": 30,
			"block": 40,
		},
		
		/* Armor */
		"tunic": {
			"type": "armor",
			"armor_type": "shirt",
			"weight": 2,
			"armor": 1,
		},
		"gambeson": {
			"type": "armor",
			"armor_type": "shirt",
			"weight": 10,
			"armor": 8,
		},
		"mail_shirt": {
			"type": "armor",
			"armor_type": "shirt",
			"weight": 16,
			"armor": 16,
		},
		"plate_armor": {
			"type": "armor",
			"armor_type": "full_plate",
			"weight": 46,
			"armor": 34,
		},
		
		/* Weapons */
		"dagger": {
			"type": "weapon",
			"weight": 3,
			"damage_type": "pierce",
			"min_damage": 10,
			"max_damage": 15,
		},
		"shortsword": {
			"type": "weapon",
			"weight": 6,
			"damage_type": "slash",
			"min_damage": 25,
			"max_damage": 35,
		},
		"longsword": {
			"type": "weapon",
			"weight": 10,
			"damage_type": "slash",
			"min_damage": 40,
			"max_damage": 55,
		},
		"simple_spear": {
			"type": "weapon",
			"weight": 3,
			"damage_type": "pierce",
			"min_damage": 20,
			"max_damage": 25,
		},
		"mace": {
			"type": "weapon",
			"weight": 8,
			"damage_type": "blunt",
			"min_damage": 25,
			"max_damage": 30,
		},
		
		"crossbow": {
			"type": "weapon",
			"isRanged": true,
			"weight": 8,
			"range": 4,
			"damage_type": "pierce",
			"min_damage": 40,
			"max_damage": 50,
			"accuracy_bonus": 10,
		},
	}
	
	var ArmorTypesStatistics = {
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
	}
})();
