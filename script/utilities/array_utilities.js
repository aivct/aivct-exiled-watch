/**
	Arrays are fun, but I don't like repeating myself.
	That's what arrays are for, after all.
	
	@author laifrank2002
	@date 2020-02-16
 */
 
function removeElementInArray(array, element)
{
	for(var index = 0, length = array.length; index < array.length; index++)
	{
		if(array[index] === element)
		{
			array.splice(index,1);
			return true;
		}
	}
	return false;
}

function removeObjectInArrayByProperty(array, property, value)
{
	for(var index = 0, length = array.length; index < array.length; index++)
	{
		if(array[index][property] === value)
		{
			array.splice(index,1);
			return true;
		}
	}
	return false;
}

function removeObjectInArrayByProperties(array, properties, values)
{
	for(var index = 0, length = array.length; index < array.length; index++)
	{
		var isDesiredObject = true;
		for(var propertyIndex = 0; propertyIndex < properties.length; propertyIndex++)
		{
			var property = properties[propertyIndex];
			var value = values[propertyIndex];
			
			if(array[index][property] !== value) 
			{
				isDesiredObject = false;
				break;
			}
		}
		if(isDesiredObject)
		{
			array.splice(index,1);
			return true;
		}
	}
	return false;
}

function replaceElementInArray(array, element, newElement)
{
	for(var index = 0, length = array.length; index < array.length; index++)
	{
		if(array[index] === element)
		{
			array.splice(index,1,newElement);
			return true;
		}
	}
	return false;
}

function cloneArray(array)
{
	return array.slice();
}

// shallow compares two arrays for equality.
function equalsArray(array, comparison)
{
	if(array.length !== comparison.length) return false;
	for(var index = 0, length = array.length; index < length; index++)
	{
		if(array[index] !== comparison[index]) return false;
	}
	return true;
}

function addUniqueElementInArray(array, element)
{
	if(!array.indexOf(element) > -1)
	{
		array.push(element);
	}
}

function addUniqueElementsInArray(array, elementsToAdd)
{
	for(var index = 0, length = elementsToAdd.length; index < length; index++)
	{
		if(!array.indexOf(elementsToAdd[index]) > -1)
		{
			array.push(elementsToAdd[index]);
		}
	}
}

// finds a property in an array of objects, return null if nothing
function findElementByPropertyInArray(array, propertyKey, propertyToFind)
{
	for(var index = 0, length = array.length; index < length; index++)
	{
		var element = array[index];
		var property = element[propertyKey];
		if(property === propertyToFind) return element;
	}
	return null;
}