angular.module('PEPFAR.usermanagement').factory('schemaService', schemaService);

function schemaService(schemaStoresService, schemaI18nService) {
    return {
        i18n: schemaI18nService,
        store: schemaStoresService,
        helpers: {
            cloneFunctions: cloneFunctions
        }
    };

    function cloneFunctions(source, destination) {
        if (!source || !destination) { return; }

        Object.getOwnPropertyNames(source).forEach(function (name) {
            var fn = source[name];
            if (typeof fn === 'function') {
                Object.defineProperty(destination, name, {
                    enumerable: false,
                    configurable: true,
                    value: fn.bind(destination)
                });
            }
        });
    }
}
