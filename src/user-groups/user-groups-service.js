angular.module('PEPFAR.usermanagement').factory('userGroupsService', userGroupsService);

function userGroupsService(Restangular) {
    return {
        createGroup: createGroup,
        updateGroup: updateGroup
    };

    function createGroup(group) {
        var group = {
            name: group.name,
            displayName: group.displayName,
            users: (group.users || []).map(function (user) { return { id: user.id }; })
        };

        return Restangular.all('userGroups').post(group);
    }

    function updateGroup(group) {
        // Get current user group and merge in changes
        return Restangular.all('userGroups')
            .one(group.id)
            .get()
            .then(function (userGroup) {
                angular.extend(userGroup, group);
                return userGroup.save();
            });
    }
}