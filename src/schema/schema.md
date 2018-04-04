# Generic Schema Definition

The schema defines static data within the Datim User Management application.  It also defines how data structures are defined, retrieved, their relationships to one another, and logic associated with the data.

#### Basic Schema Structure
+ i18n - translations keyed by locale
+ stores - data stored leveraged by the app

## i18n

Defines the translation keys by locale used within the app

```
i18n: {
    en: {
        "user": "User"
    },
    de: {
        "user": "Benutzer"
    }
}
```
## Stores

Defined the data sets used within the application that can be either static data or data retrieved from a RESTful web.  Data stores can "require" other data stores and leverage that data for filtering or making web requests.  The structure of a store is as follows:

+ name - a unique name for the data store
+ type - the type of data store
  - static - predefined (static) data
  - rest - data to be retrieved from the DHIS2 RESTful api
  - dynamic - data to be retrieved from the DHIS2 RESTful api that requires some user input (arguments)
+ requires - array of data store names required in order for the data store to be loaded / read
+ args - array of arguments (by name) leveraged by the store "config."  args must be used in conjunction with type = dynamic
+ preflight - JavaScript validation expression that must be truthy in order to execute
+ config - object representing the store configuration
  - when type is static this is the actual data set
  - when type is rest this is the restful definition
  - when type is dynamic this could be an array of restful requests keyed by name
+ extend - object representing JavaScript function expressions that will be bound to the dataset
  - fn - JavaScript function expression [or]
  - get - JavaScript function expression to be used as a getter
  - args - array of arguments bound to the fn defined (cannot be used with "get")
+ filter - array or string representing JavaScript expression(s) that will run against the dataset.  The value returned will become the new dataset - a value must be returned if using a filter expression

### Static Data Set (type = "static")
Defines static data to be used within the application

```
stores: [{
    "name": "Predefined Data Set",
    "type": "static",
    "config": [
        { "id": "Key1", "value": "Data for Key1" },
        { "id": "Key2", "value": "Data for Key2" }
    ]
}]
```

### RESTful Data Set (type = "rest")
Defines a data set within the application that is populated with data retrieved from the DHIS2 api via a web request

The definition below retrieves all of the user roles from DHIS2 and stores them into "User Roles."  The default request will disable paging and retrieve only the id and name fields.

```
stores: [{
    "name": "User Roles",
    "config": {
        "datamodel": "userRoles"
    }
}]
```

A more sophisticated data store calls a REST service by utilizing argument data

```
stores: [{
    "name": "Organisation Units at Level",
    "type": "dynamic",
    "args": [ "level" ],
    "config": {
        "datamodel": "organisationUnits",
        "get": {
            "level": "${level}",
            "fields": "id,name,displayName"
        },
        "filter": "_.sortBy(this, 'name')"
    }
}]
```

The above data store retrieves the organisationUnits at a specific level.  In order to get data the user / app must also pass in a "level" argument.  This data is then bound to the "level" field when making the get request to the server.  After retrieving the data, a lodash sort is executed ("filter") and the resulting dataset is returned.

Multiple data sets can be returned as well.  They must be keyed and the data returned is an Object that has properties named by the name of each config block.

```
stores: [{
    "name": "Multiple Data Sets",
    "config": [{
        "name": "dataSet1",
        "datamodel": "userGroups",
        "get": {
            "filter": "name:ilike:OU Data Set 1"
        }
    }, {
        "name": "dataSet2",
        "datamodel": "userGroups",
        "get": {
            "filter": "name:ilike:OU Data Set 2"
        }
    }, {
        "name": "dataSet3",
        "datamodel": "userGroups",
        "get": {
            "filter": "name:ilike:OU Data Set 3"
        }
    }]
}]
```

The above will query the DHIS2 API (userGroups) with three different filter queries.  The results will then be assigned to and object containing a property equal to the "name" value specified.  The above example would yield the following result:

```
{
    "dataSet1": [
        /* user groups */
    ],
    "dataSet2": [
        /* user groups */
    ],
    "dataSet3": [
        /* user groups */
    ]
}
```

### Extending stores with custom getters and functions with optional arguments

All data stores can have logic defined within the "extend" object of the definition.  The property defined within the extend object will yield the name of the function or getter.  The function has contextual access to "this" (the data store data) as well as "requires" (the required data stores) and the arguments if they were defined for the function.  All getters and functions automatically have return prefixed.  To define a getter and/or function:

```
stores: [{
    "name": "Static Data Store",
    "type": "static",
    "config": [
        { "name": "Test", "value": "Test Value", "isActive": true },
        { "name": "Another", "value": "Another Value", "isActive": false },
        { "name": "Third", "value": "Third Value", "isActive": false }
    ],
    "extend": {
        "active": {
            "get": "this.filter(function (data) { return data.isActive; })"
        },
        "getByName: {
            "args": [ "name" ],
            "fn": "this.filter(function (data) { return data.name === name; })"
        }
    }
}]
```

The above definition is the functional equivalent of:

```
var StaticDataStore = [
    { "name": "Test", "value": "Test Value", "isActive": true },
    { "name": "Another", "value": "Another Value", "isActive": false },
    { "name": "Third", "value": "Third Value", "isActive": false }
];

Object.defineProperty(StaticDataStore, "active", {
    enumerable: false,
    configurable: true,
    get: function () {
        return this.filter(function (data) { return data.isActive; });
    }
});

Object.defineProperty(StaticDataStore, "getByName", {
    enumerable: false,
    configurable: true,
    value: function (name) {
        return this.filter(function (data) { return data.name === name; });
    }
});

var activeEntries = StaticDataStore.active;
var testEntries = StaticDataStore.getByName('Test');
```

# DATIM User Management Schema Definition

The DATIM User Management application relies on data stores being present in order to operate.  It also requires that certain data stores implement particular methods and/or structure data in a particular fashion.

## Current User

A store must exist named "Current User" which returns a DHIS2 user entity object.  The object must be complete and contain the following:

+ authorities: array of authorities
+ hasAllAuthority: function returns Boolean
+ isUserAdministrator: function returns Boolean
+ isGlobalUser: function returns Boolean

## User Roles

A store containing all User Roles

## User Types

A store defining all of the user types in the system

+ fromUser: function that takes a user entity and returns the user type associated with that user
