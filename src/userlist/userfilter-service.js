angular.module('PEPFAR.usermanagement').service('userFilterService', userFilterService);

function userFilterService($q, schemaService) {
    var deferred = $q.defer();

    var userFilter = [
        {name: 'Name'},
        {name: 'Username'},
        {name: 'E-Mail'}
    ];

    deferred.resolve(userFilter);

    initialise();

    return {
        getUserFilter: getUserFilter
    };

    function initialise() {
        schemaService.store.get('Organisation Units at Level', 3).then(pushUserFilter('Organisation Unit'));
        schemaService.store.get('User Types').then(pushUserFilter('Types'));

        // TODO: Write some tests for this..
        $q.all([schemaService.store.get('Current User'), schemaService.store.get('User Roles')])
            .then(function (responses) {
                var currentUser = responses[0];
                var allUserRoles = responses[1];

                if (currentUser && currentUser.hasAllAuthority()) {
                    userFilter.push({name: 'User Role', secondary: allUserRoles});
                } else if (currentUser.userCredentials.userRoles && angular.isArray(currentUser.userCredentials.userRoles)) {
                    var userRoleFilters = currentUser.userCredentials.userRoles.map(function (userRole) {
                        return {name: userRole.name};
                    });
                    if (userRoleFilters.length) {
                        userFilter.push({name: 'User Role', secondary: userRoleFilters});
                    }
                }

                if (currentUser && currentUser.userGroups && angular.isArray(currentUser.userGroups)) {
                    var userGroupFilters = currentUser.userGroups.map(function (userGroup) {
                        return {name: userGroup.name};
                    });

                    if (userGroupFilters.length) {
                        userFilter.push({name: 'User Group', secondary: userGroupFilters});
                    }
                }
            });
    }

    function getUserFilter() {
        return deferred.promise;
    }

    function pushUserFilter(name) {
        return function (data) {
            userFilter.push({ name: name, secondary: data });
        }
    }
}
