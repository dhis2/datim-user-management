angular.module('PEPFAR.usermanagement').directive('partnerSelect', partnerSelectDirective);

function partnerSelectDirective(schemaService, $translate, errorHandler) {
    return {
        restrict: 'E',
        replace: true,
        scope: true,
        templateUrl: 'pepfar/agencypartner-select.html',
        link: function (scope) {
            scope.selectbox = {
                items: [],
                placeholder: $translate.instant('Select a partner')
            };

            loadValues(scope.userOrgUnit && scope.userOrgUnit.current);

            scope.$on('ORGUNITCHANGED', function (event, data) {
                errorHandler.debug('Reloading types for ', data.name); //jshint ignore:line
                loadValues(data);
            });

            function loadValues(orgUnit) {
                orgUnit = orgUnit || {};

                errorHandler.debug('Loading partners for: ', orgUnit.name);
                schemaService.store.get('Partners in Organisation', orgUnit).then(function (partners) {
                    scope.selectbox.items = partners;
                });
            }
        }
    };
}
