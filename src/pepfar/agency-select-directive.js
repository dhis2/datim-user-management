angular.module('PEPFAR.usermanagement').directive('agencySelect', agencySelectDirective);

function agencySelectDirective(schemaService, $translate, errorHandler) {
    return {
        restrict: 'E',
        replace: true,
        scope: true,
        templateUrl: 'pepfar/agencypartner-select.html',
        link: function (scope) {
            scope.selectbox = {
                items: [],
                placeholder: $translate.instant('Select an agency')
            };

            loadValues(scope.userOrgUnit && scope.userOrgUnit.current);

            scope.$on('ORGUNITCHANGED', function (event, data) {
                errorHandler.debug('Reloading types for ', data.name);
                loadValues(data);
            });

            function loadValues(orgUnit) {
                orgUnit = orgUnit || {};

                errorHandler.debug('Loading agencies for: ', orgUnit.name);
                schemaService.store.get('Agencies in Organisation', orgUnit).then(function (agencies) {
                    scope.selectbox.items = agencies;
                });
            }
        }
    };
}
