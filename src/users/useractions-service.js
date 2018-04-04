/* globals has, pick, flatten */
angular.module('PEPFAR.usermanagement').factory('userActionsService', userActionsService);

function userActionsService(Restangular, $q, errorHandler, dataEntryService, schemaService) {
    var actionRolesLoaded;
    var userActionsStore;
    var actions;
    var dataEntryRestrictions;
    var dataEntryRestrictionsUserManager;

    var currentUser;
    var currentUserUserRoles;

    initialise();

    return {
        getActions: getActions
    };

    function initialise() {
        actionRolesLoaded = schemaService.store.get('User Actions').then(function (userActionsStore_) {
            userActionsStore = userActionsStore_;

            var roles = _.indexBy(userActionsStore.roles, 'name');
            var mapRoles = function (context) {
                if (Array.isArray(context)) {
                    context.forEach(function (name, index) { context[index] = roles[name]; });
                }
                else if (typeof context === 'object') {
                    Object.keys(context).forEach(function (property) { mapRoles(context[property]); });
                }
            };

            mapRoles(userActionsStore.dataEntryRestrictions);

            actions = userActionsStore.getActionRoles();
            dataEntryRestrictions = userActionsStore.dataEntryRestrictions.normal;
            dataEntryRestrictionsUserManager = userActionsStore.dataEntryRestrictions.manager;

        }, errorHandler.errorFn('Failed to load user roles for actions'));
    }

    function getActions() {
        return $q.all([actionRolesLoaded, schemaService.store.get('Current User')])
            .then(function (responses) {
                currentUser = responses[1];
                currentUserUserRoles = (currentUser && currentUser.userCredentials.userRoles) || [];

                var api = {
                    actions: actions,
                    dataEntryRestrictions: dataEntryRestrictions,
                    dataEntryRestrictionsUserManager: dataEntryRestrictionsUserManager,
                    getDataEntryRestrictionDataGroups: getDataEntryRestrictionDataGroups,
                    hasManageUsersAction: hasManageUsersAction,
                    getActionsForUserType: getActionsForUserType,
                    getActionsForUser: getActionsForUser,
                    getUserRolesForUser: getUserRolesForUser,
                    combineSelectedUserRolesWithExisting: combineSelectedUserRolesWithExisting,
                    filterActionsForCurrentUser: filterActionsForCurrentUser,
                    getUserManagerDataEntryRoles: getUserManagerDataEntryRoles,
                    isDataEntryApplicableToUser: isDataEntryApplicableToUser,
                    getDataStreamKey: getDataStreamKey
                };

                dataEntryService.userActions = api;

                return api;
            });
    }

    function filterActionsForCurrentUser(actions) {
        if (currentUser.hasAllAuthority()) {
            return actions;
        }

        return _.filter(actions, function (action) {
            return action.default === true || _.filter(currentUserUserRoles, function (userRole) {
                return action.userRoleId === userRole.id;
            }).length;
        });
    }

    function hasManageUsersAction(userType) {
        var availableActions = userActionsStore.actions[getPreferredNameFormat(userType)] || [];
        return availableActions.indexOf('Manage users') !== -1;
    }

    function getActionsForUserType(userType) {
        var availableActions = userActionsStore.actions[getPreferredNameFormat(userType)] || [];

        return actions.filter(function (action) {
            return !action.userGroupRestriction && action.userRoleId && (availableActions.indexOf(action.name) >= 0);
        });
    }

    function getActionsForUser(user) {
        var userType = schemaService.store.get('User Types', true).fromUser(user);
        var actions = getActionsForUserType(userType);
        var userRoles = (user && user.userCredentials && user.userCredentials.userRoles) || [];
        var userRoleIds = userRoles.map(pick('id'));

        return actionRolesLoaded.then(function () {
            actions.forEach(function (action) {
                action.hasAction = hasUserRoleFor(userRoleIds, action);
            });
            return $q.when(actions);
        });
    }

    function hasUserRoleFor(userRoleIds, action) {
        return (userRoleIds.indexOf(action.userRoleId) >= 0);
    }

    function getUserActionsForNames(selectedActions, actions) {
        var userActions;
        var selectedActionNames = Object.keys(selectedActions)
            .map(function (key) {
                if (selectedActions[key] === true) {
                    return key;
                }
            }).filter(function (action) {
                return action && action !== '';
            });

        userActions = (actions || []).filter(function (action) {
            return selectedActionNames.indexOf(action.name) >= 0;
        });

        return userActions;
    }

    function getUserRolesForUser(user, actions, userType) {
        if (!userType || !angular.isString(userType)) {
            throw new Error('Passed parameter userType should be a string');
        }

        var userRoles;
        var dataEntryRoles = [];
        var userActions = (user && user.userActions) || [];
        var dataEntryRoleNames = Object.keys(dataEntryService.dataEntryRoles)
            .filter(function (dataEntryKey) {
                return dataEntryService.dataEntryRoles[dataEntryKey];
            })
            .map(function (dataEntryKey) {
                return dataEntryKey;
            });

        dataEntryRoles = dataEntryRoleNames.map(function (dataEntryRoleName) {
            return dataEntryRestrictions[userType][dataEntryRoleName]
                .filter(function (userRole) {
                    return userRole.userRoleId;
                })
                .map(function (userRole) {
                    return {id: userRole.userRoleId, name: userRole.userRole};
                });
        }).reduce(function (current, value) {
            return current.concat(value);
        }, dataEntryRoles);

        userRoles = getUserActionsForNames(userActions, actions)
            .map(pick('userRoleId', 'userRole'))
            .filter(has('userRoleId'))
            .map(function (item) {
                return {
                    name: item.userRole,
                    id: item.userRoleId
                };
            });

        return userRoles.concat(dataEntryRoles);
    }

    function getAvailableUserRoles(dataGroups, actions) {
        var dataGroupRoles = (dataGroups || [])
            .map(pick('userRoles'))
            .reduce(flatten(), []);

        var actionRoles = (actions || [])
            .filter(has('userRoleId'))
            .map(pick('userRole', 'userRoleId'))
            .map(function (item) {
                return {
                    name: item.userRole,
                    id: item.userRoleId
                };
            });

        return [].concat(dataGroupRoles).concat(actionRoles);
    }

    function combineSelectedUserRolesWithExisting(userToEdit, user, dataGroups, actions, userType) {
        var selectedUserRoles = getUserRolesForUser(user, actions, userType);
        var availableUserRoleIds = getAvailableUserRoles(dataGroups, actions).map(pick('id'));
        var currentUserRoles = (userToEdit.userCredentials && userToEdit.userCredentials.userRoles) || [];
        var userRoleBasis = currentUserRoles.filter(function (userRole) {
            return availableUserRoleIds.indexOf(userRole.id) === -1;
        });

        return [].concat(userRoleBasis).concat(selectedUserRoles);
    }

    function getDataEntryRestrictionDataGroups(userType) {
        var userTypeToCheck = getPreferredNameFormat(userType);
        return Object.keys(dataEntryRestrictions[userTypeToCheck] || {});
    }

    function getPreferredNameFormat(userType) {
        if (!angular.isString(userType)) { return ''; }

        return userType.split('-').map(function (namePart) {
            return namePart.charAt(0).toUpperCase() + namePart.substr(1).toLowerCase();
        }).join('-');
    }

    function getUserManagerDataEntryRoles(userType, userEntity) {
        return _.chain(dataEntryRestrictionsUserManager[userType]).values().flatten()
            .filter(function (userRole) {
                return userActionsStore.isRoleApplicableToUser(userRole, userEntity);
            })
            .value();
    }

    function isDataEntryApplicableToUser(dataEntryName, userEntity) {
        return userActionsStore.isDataEntryApplicableToUser(dataEntryName, userEntity);
    }

    function getDataStreamKey(streamName) {
        return userActionsStore.getDataStreamKey(streamName);
    }
}
