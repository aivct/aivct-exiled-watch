/**
	A set of common utility functions.
 */
var ObjectUtilities = {
	/**
		Copies over all the public properties from one prototype to another.
		Note that 
			destinationPrototype instanceof sourcePrototype === false
		@param {object} destination the prototype to which properties should be applied
		@param {object} source the source of prototype properties
		*/
	compositePrototype: function(destination, source)
	{
		for(var property in source.prototype)
		{
			destination.prototype[property] = source.prototype[property];
		}
		return true;
	},
	
	/**
		Classic object inheritance.
		Note that
			childInstance instanceof parentInstance === true
		Call this before defining the prototype methods.
		@param {object} child the child class
		@param {object} parent the parent class
		*/
	inheritPrototype: function(child, parent)
	{
		child.prototype = Object.create(parent.prototype);
		Object.defineProperty(child.prototype, 'constructor', {
			value: child,
			enumerable: false, // so that it does not appear in 'for in' loop
			writable: true });
	},
	
	/**
	 * Shallow copies over properties from one object to another one.
	 * @param {object} destination the destination object
	 * @param {object} source the source object
	 */
	copyProperties: function(destination, source)
	{
		for(var property in source)
		{
			destination[property] = source[property];
		}
		return true;
	},

	/**
	 * Checks if an object is devoid of keys or not.
	 * @param {object} object the object to interrogate
	 * @returns boolean if the object is empty or not; 
	 *  note that an object with improperly deleted properties will still appear to not be empty, 
	 *  ie {"x": undefined} will return false
	 */
	isEmpty: function(object)
	{
		var keys = Object.keys(object);
		if(keys.length === 0) return true;
		return false;
	},

	/**
		Reverses how dictionaries normally work.
		Returns the first key that contains the property of an object.
		Remember that since order is not guaranteed, this isn't either 
		Use  only when you're sure it's UNIQUE or don't care which key it is.
		
		@date 2020-05-21
		@author laifrank2002
		
		@param {object} object the target object in key value structure
		@param {*} property a value used to compare against for strict equality 
		@return {*} key the first key that is equal to some property, or undefined if it doesn't exist.
		*/
	reverseDictionaryByProperty: function(object, property)
	{
		for(var key in object)
		{
			if(object[key] === property)
			{
				return key;
			}
		}
		
		return undefined;
	},
	
	/**
		Nested reverses dictionaries.
		Returns the first key of the first key that contains an object of a property 
		that equals some value.
		ie,		
		{
			'key': {
				'property': value
			}
		}
		searches WITHIN each object until object[key][property] === value 
		
		@date 2020-05-26
		@author laifrank2002
		
		@param {object} object the target object in key value structure
		@param {string} property a key property to which to check nested keys 
		@param {*} value a value used to compare against for strict equality 
		@return {*} key the first key of which this defined property contains some such value, or undefined if it doesn't exist.
		*/
	reverseDictionaryByPropertyNested: function(object, property, value)
	{
		for(var key in object)
		{
			if(object[key][property] === value)
			{
				return key;
			}
		}
		
		return undefined;
	},

};