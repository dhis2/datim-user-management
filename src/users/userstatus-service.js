angular.module('PEPFAR.usermanagement').factory('userStatusService', userStatusService);

function userStatusService(Restangular, $q) {
    return {
        disable: disableUser,
        enable: enableUser
    };

    function disableUser(userId) {
        if (!angular.isString(userId)) {
            return $q.reject('User id is not a string');
        }

        return getUser(userId)
            .then(setUserDisabled)
            .then(saveUser);
    }

    function enableUser(userId) {
        if (!angular.isString(userId)) {
            return $q.reject('User id is not a string');
        }
        return getUser(userId)
            .then(setUserEnabled)
            .then(saveUser)
            .then(function(response) {
                return (response.stats.updated > 0);
            })
            ;
    }

    function setUserDisabled(user) {
        var userCredentials = user.userCredentials;
        userCredentials.disabled = true;
        return user;
    }

    function setUserEnabled(user) {
        var userCredentials = user.userCredentials;
        userCredentials.disabled = false;
        return user;
    }

    function saveUser(user) {
        return user.put();
    }

    function getUser(userId) {
        return Restangular.all('users')
            .get(userId, {
                fields: ':owner,userCredentials[:owner,userRoles[id,name]],userGroups'
            });
    }
}
