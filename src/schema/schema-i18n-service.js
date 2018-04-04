angular.module('PEPFAR.usermanagement').factory('schemaI18nService', schemaI18nService);

function schemaI18nService(Restangular, errorHandler, $q) {
    return function loader(options) {
        var deferred = $q.defer();

        var timer = window.setInterval(function () {
            // We need to wait for the angular run block that sets the DHIS2 api base url
            if (Restangular.configuration.baseUrl) {
                window.clearInterval(timer);
                requesti18();
            }
        }, 250);

        return deferred.promise;

        function requesti18() {
            Restangular.one('dataStore')
                .one('datim-user-management')
                .one('i18n')
                .get()
                .then(resolve)
                .catch(function (err) {
                    errorHandler.debug('error loading translations', err);
                    return resolve({});
                });
        }

        function resolve(data) {
            var key = options && options.key ? options.key : 'en';
            deferred.resolve(data[key] || data['en'] || data);
        }
    };
}
