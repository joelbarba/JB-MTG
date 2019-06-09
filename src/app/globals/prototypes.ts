// Sum Up:
//  - array.copy()
//  - array.getById(id)
//  - array.removeById(id)
//  - array.getByProp(prop, value)
//  - array.getElementsByProp(prop, value)
//
//  - object.copy()
//  - object.keyMap(propsStr)


interface Array<T> {
  copy(): Array<T>;
  getById(id:string): T;
  removeById(id:string): T;
  removeByProp(prop:string, value:string): T;
  getKeyById(keyName:string, value:string): T;
  getByProp(property:string, value:string): T;
  getKeyByProp(keyName:string, property:string, value:string): T;
  getElementsByProp(property:string, value:string): Array<T>;
}

interface Object {
  keyMap(propNames:string): Object;
  copy(): Object;
}

/**
 * @ngdoc method
 * @name getElementsByProp
 * @param {String} property - the name of the objects property
 * @param {String} value - the value we want it to equal
 * @description returns an array of items from our array where the value is present.
 * */
Array.prototype['getElementsByProp'] = function<T>(property:string, value:string):T[] {
  return this.filter(item => item[property] === value);
};

/**
 * @function getByProp
 * @memberOf Array
 * @param {String} property - the name of the objects property
 * @param {String} value - the value we want it to equal
 * @description returns an item if its in a list and its property is equal to the value.
 * */
Array.prototype['getByProp'] = function(property:string, value:any){
  for (let ind = 0; ind < this.length; ++ind) {
    if (this[ind].hasOwnProperty(property) && this[ind][property] === value) {
      return this[ind];
    }
  }
  return null;
};

/**
 * @function getById
 * @memberOf Array
 * @param {String} value - the value we want it to equal
 * @description gets an item by its id and returns it if present.
 * */
Array.prototype['getById'] = function(value:string) {
  return this.getByProp('id', value);
};

/**
 * @function removeById
 * @memberOf Array
 * @param {String} id - the id of the object we want to remove
 * @description removes an object that matches the id = matching value. It returns the subsctracted object
 * */
Array.prototype['removeById'] = function(id:string) {
  let selectedItem = this.getById(id);
  if(!!selectedItem){
    let pos = this.indexOf(selectedItem);
    let item = this.splice(pos, 1);
    return item;

  } else {
    return false;
  }
};

/**
 * @function removeByProp
 * @memberOf Array
 * @param {String} prop - name of the property to match
 * @param {String} value - value of the property to match
 * @description removes an object that matches the prov = value. It returns the subsctracted object
 * */
Array.prototype['removeByProp'] = function(property:string, value:string) {
  const selectedItem = this.getByProp(property, value);
  if (!!selectedItem) {
    const pos = this.indexOf(selectedItem);
    return this.splice(pos, 1);
  } else {
    return false;
  }
};

/**
 * @function getKeyById
 * @memberOf Array
 * @param {String} keyName - name of the property of the object to return
 * @param {String} value - the value we want it to equal
 * @description gets an item by its id and returns the selected property (keyName) of it (if present).
 * */
Array.prototype['getKeyById'] = function(keyName:string, value:string) {
  let obj = this.getById(value);
  if (!keyName) { return obj; }
  if (!!obj && obj.hasOwnProperty(keyName)) {
    return obj[keyName];
  } else {
    return null;
  }
};

/**
 * @function getKeyById
 * @memberOf Array
 * @param {String} keyName - name of the property of the object to return
 * @param {String} property - name of the property to match by
 * @param {String} value - the value we want it to equal
 * @description gets an item by matching by "property" and returns the selected property (keyName) of it (if present).
 * */
Array.prototype['getKeyByProp'] = function(keyName:string, property:string, value:string) {
  let obj = this.getByProp(property, value);
  if (!keyName) { return obj; }
  if (!!obj && obj.hasOwnProperty(keyName)) {
    return obj[keyName];
  } else {
    return null;
  }
};



/**
 * @function copy
 * @memberOf Array
 * @description Deep copy of the array
 * */
Array.prototype['copy'] = function() {
  let newArray = [];
  this.forEach(item => {
    if (item !== null && (Array.isArray(item) || typeof item === 'object')) {
      newArray.push(item.copy());

    } else {
      newArray.push(item);
    }
  });
  return newArray;
};


/********************************************************************************************************/

/**
 * @ngdoc Object.prototype
 * @name keyMap
 * @description It returns the same object but only with the selected properties
 *              The returned object is never a reference (always a deep copy)
 * @param propNames ? String - String with the names of the properties to select, seperated by ','. Spaces will be ignored
 * @example
 *      var myObj1 = { id: 1, name: 'Sam', age: 10, isValid: true };
 *      myObj1.keyMap('id, name');  // --> Returns an object = { id: 1, name: 'Sam' };
 *      myObj1.keyMap('id, age, isValid');  // --> Returns an object = { id: 1, age: 10, isValid:true };
 */
Object.defineProperty(Object.prototype, 'keyMap', {
  value: function(propNames) {
    let newObj = {};
    if (!!propNames && typeof propNames === 'string') {
      let keyList = propNames.replace(/[ ]/g, '').split(',');
      keyList.forEach((keyName) => {
        newObj[keyName] = this[keyName];
      });
    }
    return newObj;
  },
  enumerable: false
});



/**
 * @ngdoc Object.prototype
 * @name copy
 * @description It returns a deep copy of the object (no references at any level)
 * @example myObj2 = myObj1.copy();
 */
Object.defineProperty(Object.prototype, 'copy', {
  value: function() {
    let newObj = {};

    for (let keyName in this) { // Loop all object properties
      if (this.hasOwnProperty(keyName)) { // Exclude prototypes

        if (this[keyName] !== null && (typeof this[keyName] === 'object' || Array.isArray(this[keyName])) ) {
          newObj[keyName] = this[keyName].copy();

        } else {
          newObj[keyName] = this[keyName];
        }
      }
    }
    return newObj;
  },
  enumerable: false
});

