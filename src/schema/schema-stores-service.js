angular.module('PEPFAR.usermanagement').factory('schemaStoresService', schemaStoresService);

function schemaStoresService(Restangular, errorHandler, schemaExtensionsService, $q, _) {
    var storeData = null;
    var storeMap = {};

    var loader = Restangular.one('dataStore')
        .one('datim-user-management')
        .one('stores')
        .get()
        .then(function (storesConfig) {
            return (storeData = storesConfig);
        })
        .catch(function (err) {
            var status = err.statusText || (err.status === 404 ? 'datim-user-management/stores does not exist in the DHIS2 data store' : err.status);
            errorHandler.error('Error retrieving schema stores: ' + status);
        })
        .then(function (data) {
            return loadStores(data || []);
        });

    var api = {
        get: function getStore(name, context, synchronous) {
            if ((arguments.length === 2 && context === true) || synchronous === true) {
                return getStoreByName(name, context, synchronous);
            }

            return loader.then(function () {
                return getStoreByName(name, context, synchronous);
            });
        }
    };

    window.schemaStore = api;

    return api;

    function getRequiredStores(store) {
        if (!store.requires) { return $q.when({}); }

        return $q.all(store.requires.map(function (name) { return storeMap[name]; })).then(function (stores) {
            return store.requires.reduce(function (requires, name, index) {
                requires[name] = stores[index];
                return requires;
            }, {});
        });
    }

    function getArgumentContext(store, args) {
        return (store.args || []).reduce(function (context, argName, argIndex) {
            context[argName] = args[argIndex];
            return context;
        }, {});
    }

    function loadStores(stores) {
        stores.forEach(function (store) {
            if (store.type === 'dynamic') {
                storeMap[store.name] = store;
            }
            else {
                storeMap[store.name] = getRequiredStores(store).then(function (requires) {
                    var localContext = { requires: requires };
                    var clone = angular.fromJson(angular.toJson(store));

                    if (clone.config) {
                        if (clone.config.get) {
                            Object.keys(clone.config.get).forEach(function (key) {
                                clone.config.get[key] = _.template(clone.config.get[key])(localContext);
                            });
                        }
                        if (clone.config.endpoint) {
                            clone.config.endpoint = _.template(clone.config.endpoint)(localContext);
                        }
                    }

                    return loadStore(clone, {}, localContext).then(function (data) {
                        return store.data = data || [];
                    });
                });
            }
        });

        return storeMap;
    }

    function loadStore(store, context, localContext) {
        var name = store.name;
        var type = (store.type || 'REST').toLowerCase();
        var storeConfig = store.config;

        if (type === 'static') {
            return $q.when(evalFilter(storeConfig || [], store.filter));
        }
        else if (type === 'rest') {
            var datamodel = storeConfig.datamodel;
            var endpoint = storeConfig.endpoint || datamodel;
            var httpConfig = angular.extend({ cache: true }, storeConfig.httpConfig);

            var getParams = angular.extend({ fields: 'id,name', paging: false }, storeConfig.get);
            var getArgs = [getParams];
            if (getParams.id) {
                getArgs.splice(0, 0, getParams.id);
                delete getParams.id;
            }

            if (storeConfig.get === null) {
                getArgs.length = 0;
            }

            return Restangular[(getArgs.length > 1 ? 'all' : 'one')](endpoint)
                .withHttpConfig(httpConfig)
                .get(getArgs[0], getArgs[1])
                .then(function (response) {
                    if (!response) {
                        errorHandler.warning('No data returned for "' + name + '"');
                    }

                    var data = response || [];
                    if (!angular.isArray(data) && datamodel && datamodel in data) {
                        data = data[datamodel];
                    }

                    return evalFilter(data, storeConfig.filter) || [];
                })
                .catch(function (err) {
                    var errorMessage = 'Unable to load "' + (name || endpoint) + '": ' +
                        (err.message || (err.data || {}).message || err.statusText || err);
                    errorHandler.error(errorMessage);
                });
        }
        else {
            throw 'type ' + type + ' is not supported.';
        }

        function evalFilter(data, filter) {
            if (data) {
                bindExtensions(store.extend, data, localContext);
            }

            if (!filter) { return data; }

            (angular.isArray(filter) ? filter : [ filter ]).forEach(function (filter) {
                try {
                    var argNames = Object.keys(context || {});
                    var argValues = argNames.map(function (name) { return context[name]; });
                    var oldData = data;

                    data = schemaExtensionsService
                        .bind(data, 'getFiltered', { fn: filter, args: argNames }, localContext)
                        .getFiltered.apply(data, argValues);

                    errorHandler.debug('filter expression for "' + filter + '" returned data: ', data, ' with input data', oldData);

                    if (oldData != data) {
                        bindExtensions(store.extend, data, localContext);
                        delete oldData.getFiltered;
                    }
                    else if (data && data.getFiltered) {
                        delete data.getFiltered;
                    }
                } catch (err) {
                    errorHandler.warning('schema-stores-service: loadStore.evalFilter failed to invoke for store [' + store.name + '] filter: ' + filter);
                    throw err;
                }
            });

            return data;
        }
    }

    function loadDynamicStore(store) {
        var args = Array.prototype.slice.call(arguments, 1);

        if (store.preflight && !schemaExtensionsService.isTruthy(store.preflight, store.args, args)) {
            return $q.reject('preflight failed - the arguments and / or condition [' + store.preflight + '] is invalid');
        }

        return getRequiredStores(store).then(function (requires) {
            var localContext = { requires: requires };
            var argumentContext = getArgumentContext(store, args);
            var templateContext = angular.extend({}, localContext, argumentContext);

            var configs = angular.isArray(store.config) ? store.config : [store.config];
            configs = angular.fromJson(angular.toJson(configs));

            var promises = configs.map(function (config) {
                Object.keys(config.get || {}).forEach(function (key) {
                    config.get[key] = _.template(config.get[key])(templateContext);
                });
                var configStore = { name: config.name || store.name, type: 'REST', config: config, extend: store.extend };
                return loadStore(configStore, argumentContext, localContext);
            }).reduce(function (arr, promises) { return arr.concat(promises); }, []);

            return $q.all(promises).then(function (results) {
                if (results.length <= 1) { return results[0]; }

                return results.reduce(function (obj, value, index) {
                    obj[configs[index].name] = value;
                    return obj;
                }, {});
            });
        });
    }

    function bindExtensions(extendObject, dataObject, localContext) {
        if (!dataObject) { return; }

        Object.keys(extendObject || {}).forEach(function (key) {
            var target = extendObject[key].target || 'collection';
            if (target === 'item' && angular.isArray(dataObject)) {
                dataObject.forEach(function (data) {
                    schemaExtensionsService.bind(data, key, extendObject[key], localContext);
                });
            }
            else {
                schemaExtensionsService.bind(dataObject, key, extendObject[key], localContext);
            }
        });
    }

    function getStoreByName(name, context, synchronous) {
        var args = Array.prototype.slice.call(arguments, 1);

        if (arguments.length === 3 && typeof context === 'boolean') {
            synchronous = context;
            context = undefined;
        }

        if (synchronous === true) {
            var store = _.find(storeData, { name: name });
            store = notifyIfStoreMissing(store, name);
            return (!store ? null : store.data || null);
        }

        var store = storeMap[name];
        notifyIfStoreMissing(store, name);
        if (!store || store.type !== 'dynamic') {
            return store;
        }

        args.splice(0, 0, store);
        return loadDynamicStore.apply(this, args);
    }

    function notifyIfStoreMissing(store, name) {
        if (!store) {
            errorHandler.error('The requested store "' + name + '" has not been defined in the DHIS2 data store');
        }
        return store;
    }
}
