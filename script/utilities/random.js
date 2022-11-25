/**
	Generates random everything.
	
	@author laifrank2002
	@date 2021-02-15
 */
function randomElementInArray(array)
{
	return array[randomIndex(array.length)];
}

function randomKeyInObject(object)
{
	return randomElementInArray(Object.keys(object));
}

function randomPropertyInObject(object)
{
	return object[randomElementInArray(Object.keys(object))];
}

// min inclusive, max exclsusive
function randomIndex(max)
{
	return Math.floor(randomNumber(0,max));
}

// min and max inclusive
function randomInteger(min, max)
{
	return Math.round(randomNumber(min,max));
}

// min and max inclusive
function randomNumber(min, max)
{
	return Math.random() * (max - min) + min;
}

// random for each character, uses only latin a-z
function randomString(length)
{
	var string = "";
	var charset = "abcdefghijklmnopqrstuvwxyz";
	for(var i = 0; i < length; i++)
	{
		var index = randomIndex(charset.length);
		string += charset.substring(index, index + 1);
	}
	return string;
}

// returns a vector representing a cardinal direction
function randomCardinalDirectionVector()
{
	var random = Math.random();
	if(random > 0.75)
	{
		return new Vector(1,0);
	}
	else if(random > 0.5)
	{
		return new Vector(0,1);
	}
	else if(random > 0.25)
	{
		return new Vector(-1,0);
	}
	else 
	{
		return new Vector(0,-1);
	}
}

// returns a random key from a dictionary of weights
function randomWeightedKey(dictionary)
{
	var totalWeight = 0;
	for(var key in dictionary)
	{
		totalWeight += dictionary[key];
	}
	
	var roll = Math.random() * totalWeight;
	var cumulativeWeight = 0;
	for(var key in dictionary)
	{
		cumulativeWeight += dictionary[key];
		if(roll < cumulativeWeight) return key;
	}
}