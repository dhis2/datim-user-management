angular.module('PEPFAR.usermanagement').directive('selectUsertype', userTypeSelectDirective);

function userTypeSelectDirective(schemaService, errorHandler, $q, _) {
    var directive = {
        restrict: 'E',
        replace: true,
        scope: {
            userTypes: '=',
            user: '='
        },
        templateUrl: 'users/selectusertype.html',
        link: linkFn
    };

    return directive;

    function linkFn(scope) {
        scope.selectbox = {
            placeholder: 'Select user type',
            items: [],
            selected: scope.userType
        };

        //TODO: Should not use parent $scope hack..
        loadValues(scope.$parent && scope.$parent.userOrgUnit && scope.$parent.userOrgUnit.current);

        scope.$on('ORGUNITCHANGED', function (event, data) {
            errorHandler.debug('Reloading types for ', data.name); //jshint ignore:line
            loadValues(data);
            scope.selectbox.selected = undefined;
            scope.user.userType = undefined;
        });

        function loadValues(orgUnit) {
            scope.selectbox.items = [];

            $q.all([
                schemaService.store.get('Interagency Groups', orgUnit),
                schemaService.store.get('Agencies in Organisation', orgUnit),
                schemaService.store.get('Partners in Organisation', orgUnit)
            ]).then(function (results) {
                var interAgency = results[0];
                var agencies = results[1];
                var partners = results[2];

                scope.userTypes.forEach(function (item) {
                    if (item.name === 'Agency') {
                        scope.selectbox.items.push(item);
                        // TODO: check "agencies" variable for data?
                    }
                    else if (item.name === 'Inter-Agency' && interAgency && (interAgency.userUserGroup || interAgency.userUserGroup)) {
                        scope.selectbox.items.push(item);
                    }
                    else if (item.name !== 'Global') {
                        scope.selectbox.items.push(item);
                        // TODO: check "partners" variable for data?
                    }
                });

                scope.selectbox.items = _.sortBy(scope.selectbox.items, 'name');
            });
        }
    }
}
