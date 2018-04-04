angular.module('PEPFAR.usermanagement').controller('globalUserInviteController', globalUserInviteController);

function globalUserInviteController(dataGroups, currentUser,
                                    userActions, userService, userGroups, notify,
                                    $state, errorHandler, _) {
    var vm = this;

    vm.getGlobalInviteObject = function () {
        var actions = userActions.getActionsForUserType('Global');

        var userObject = userService.getUserInviteObject(
            vm.user, dataGroups, actions, currentUser.organisationUnits, {}
        );

        userObject.addEntityUserGroup(userGroups.userUserGroup);
        userObject.addEntityUserGroup(userGroups.mechUserGroup);

        if (vm.user.userActions['Manage users'] === true) {
            var manageUsersAction = _.find(userActions.actions, { name: 'Manage users' });
            if (manageUsersAction && manageUsersAction.userRoleId) {
                userObject.userCredentials.userRoles.push({ id: manageUsersAction.userRoleId });
            }

            userObject.addEntityUserGroup(userGroups.userAdminUserGroup);
        }

        return userObject;
    };

    //Properties
    vm.isProcessing = false;
    vm.user = {
        locale: {name: 'en', code: 'en'},
        userActions: {
            'Manage users': false
        },
        dataGroups: dataGroups.reduce(function (dataGroupObject, dataGroup) {
            dataGroupObject[dataGroup.name] = {
                access: true
            };
            return dataGroupObject;
        }, {})
    };

    //Methods
    vm.invite = invite;
    vm.getErrorString = getErrorString;

    function initialize() {
        if (!(currentUser.isGlobalUser() && currentUser.isUserAdministrator()) && !currentUser.hasAllAuthority()) {
            errorHandler.debug('This user is not a global user administrator');
            errorHandler.debug('All authority returned: ', currentUser.hasAllAuthority());
            errorHandler.debug('User administrator role returned: ', currentUser.isUserAdministrator());
            $state.go('noaccess', {message: 'Your user account does not seem to have the authorities to access this functionality.'});
            return;
        }
        if (dataGroups.length <= 0) {
            errorHandler.debug('This user does not seem to have access to any data streams');
            errorHandler.debug('User data streams', dataGroups);
            $state.go('noaccess', {message: 'Your user account does not seem to have access to any of the data streams.'});
            return;
        }
    }
    initialize();

    function invite() {
        var userObject;

        vm.isProcessing = true;

        vm.userInviteObjectToSend = userObject = vm.getGlobalInviteObject();

        userService.inviteUser(userObject)
            .then(function (newUser) {
                if (newUser.userCredentials && angular.isString(newUser.userCredentials.username) && vm.user.locale && vm.user.locale.code) {
                    userService.saveUserLocale(newUser.userCredentials.username, vm.user.locale.code)
                        .then(function () {
                            notify.success('User invitation sent');
                            $state.go('globalAdd', {}, {reload: true});
                        }, function () {
                            notify.warning('Saved user but was not able to save the user locale');
                        })
                        .finally(function () {
                            vm.isProcessing = false;
                        });
                }

            })
            .catch(function () {
                notify.error('Request to add the user failed');
            })
            .finally(function () {
                vm.isProcessing = false;
            });
    }

    function getErrorString() {
        if (!vm.user.email) {
            return 'Please check if you entered an e-mail address';
        }

        return 'Invite user';
    }
}
