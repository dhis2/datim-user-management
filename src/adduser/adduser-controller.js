angular.module('PEPFAR.usermanagement').controller('addUserController', addUserController);

function addUserController($scope, userTypes, dataGroups, currentUser, dimensionConstraint, //jshint maxstatements: 60
                           userActions, userService, $state, notify, schemaService,
                           userFormService, userUtils, dataEntryService, errorHandler) {

    errorHandler.debug(currentUser.isGlobalUser && currentUser.isGlobalUser() ? 'Is a global user' : 'Is not a global user');

    var vm = this;
    var validations = userFormService.getValidations();

    //Properties
    vm.title = 'Add or delete user';
    vm.dataGroups = getDataGroupsForUserType(dataGroups);
    vm.actions = [];
    vm.languages = [];
    vm.isProcessingAddUser = false;
    vm.dataGroupsInteractedWith = validations.dataGroupsInteractedWith;
    vm.allowUserAdd = false;
    vm.dimensionConstraint = dimensionConstraint;
    vm.userInviteObject = {};
    vm.isGlobalUser = currentUser.isGlobalUser && currentUser.isGlobalUser();
    vm.dataEntryStreamNamesForUserType = [];
    vm.isUserManager = false;
    vm.hasDataEntryEnabled = hasDataEntryEnabled;

    //Methods
    vm.addUser = addUser;
    vm.validateDataGroups = validateDataGroups;
    vm.getUserManagerRoles = getUserManagerRoles;
    vm.getUserManagerDataAccessGroups = getUserManagerDataAccessGroups;
    vm.checkAllBoxesForUserManager = checkAllBoxesForUserManager;
    vm.getErrorString = getErrorString;
    vm.getDataEntryRolesNotShown = getDataEntryRolesNotShown;

    //Scope properties
    $scope.userOrgUnit = {
        current:  vm.activeOrgUnit = (currentUser && currentUser.organisationUnits && currentUser.organisationUnits[0]) || undefined
    };
    $scope.userTypes = userTypes || [];
    $scope.user = userService.getUserObject();

    //Scope watchers
    $scope.$watch('userOrgUnit.current', function (newVal, oldVal) {
        if (newVal !== oldVal && newVal && newVal.name) {
            $scope.$broadcast('ORGUNITCHANGED', newVal);
        }
    });

    initialize();

    $scope.$watch('user.userType', function (newVal, oldVal) {
        if (newVal !== oldVal && newVal && newVal.name) {
            $scope.user.userActions = {};
            vm.actions = userActions.filterActionsForCurrentUser(userActions.getActionsForUserType(newVal.name));

            if (newVal.name === 'Inter-Agency') {
                schemaService.store.get('Interagency Groups', getCurrentOrgUnit()).then(function (interAgencyUserGroups) {
                    $scope.user.userEntity = interAgencyUserGroups;
                });
            }

            vm.dataGroups = getDataGroupsForUserType(dataGroups);
            $scope.user.dataGroups = createUserGroupsObjectFromDataGroups(vm.dataGroups);
            vm.isUserManager = false;

            dataEntryService.reset();
        }
    });

    function initialize() {
        if (!currentUser.hasAllAuthority() && !currentUser.isUserAdministrator()) {
            errorHandler.debug('This user is not a user administrator');
            errorHandler.debug('All authority returned: ', currentUser.hasAllAuthority());
            errorHandler.debug('User administrator role returned: ', currentUser.isUserAdministrator());
            $state.go('noaccess', {message: 'Your user account does not seem to have the authorities to access this functionality.'});
            return;
        }
        if (vm.dataGroups.length <= 0) {
            errorHandler.debug('This user does not seem to have access to any data streams');
            errorHandler.debug('User data streams', vm.dataGroups, dataGroups);
            $state.go('noaccess', {message: 'Your user account does not seem to have access to any of the data streams.'});
            return;
        }

        $scope.user.dataGroups = createUserGroupsObjectFromDataGroups(vm.dataGroups);

        dataEntryService.userActions = userActions;
        vm.actions = userActions.getActionsForUserType();
    }

    function hasDataEntryEnabled(streamName) {
        return dataEntryService.hasDataEntryForStream(streamName);
    }

    function createUserGroupsObjectFromDataGroups(dataGroups) {
        return dataGroups.reduce(function (dataGroups, dataGroup) {
            if (dataGroup && dataGroup.name) {
                dataGroups[dataGroup.name] = {
                    access: false
                };
            }
            return dataGroups;
        }, {});
    }

    function getCurrentOrgUnit() {
        return ($scope.userOrgUnit && $scope.userOrgUnit.current) || {};
    }

    function addUser() {
        if (vm.isUserManager) {
            addUserManager();
        } else {
            addNormalUser();
        }
    }

    function addUserManager() {
        vm.isProcessingAddUser = true;

        vm.userInviteObject = getInviteObject([], []);
        addDimensionConstraintForType();
        addUserManagerUserRoles();
        addAllAvailableDataStreams();

        if (verifyUserInviteObject() &&
            addUserGroupsForMechanismsAndUsers() &&
            addUserGroupForUserAdmin()) {

            sendInvite();
        } else {
            notify.error('Unable to invite user manager');
        }
    }

    function addNormalUser() {
        vm.isProcessingAddUser = true;

        vm.userInviteObject = getInviteObject(vm.dataGroups, vm.actions);
        addDimensionConstraintForType();

        if (!verifyUserInviteObject() || !addUserGroupsForMechanismsAndUsers()) {
            return;
        }

        sendInvite();
    }

    function sendInvite() {
        //TODO: Clean this up
        userService.inviteUser(vm.userInviteObject)
            .then(function (newUser) {
                if (newUser.userCredentials && angular.isString(newUser.userCredentials.username) && $scope.user.locale && $scope.user.locale.code) {
                    userService.saveUserLocale(newUser.userCredentials.username, $scope.user.locale.code)
                        .then(function () {
                            notify.success('User invitation sent');
                            $scope.user = userService.getUserObject();
                            vm.isProcessingAddUser = false;
                            $state.go('add', {}, {reload: true});
                        }, function () {
                            vm.isProcessingAddUser = false;
                            notify.warning('Saved user but was not able to save the user locale');
                        });
                }

            }, function () {
                notify.error('Request to add the user failed');
                vm.isProcessingAddUser = false;
            });
    }

    function getInviteObject(dataGroups, actions) {
        return userService.getUserInviteObject(
            $scope.user,
            dataGroups,
            actions,
            [getCurrentOrgUnit()],
            userActions.dataEntryRestrictions
        );
    }

    function checkAllBoxesForUserManager() {
        if (vm.isUserManager) {
            userUtils.storeDataStreams($scope.user.dataGroups);
            userUtils.storeUserActions($scope.user.userActions);

            $scope.user.dataGroups = userUtils.setAllDataStreams($scope.user.dataGroups);
            $scope.user.userActions = userUtils.setAllActions(vm.actions);
            dataEntryService.setAllDataEntry(getUserType(), $scope.user.userEntity);
        } else {
            $scope.user.dataGroups = userUtils.restoreDataStreams($scope.user.dataGroups);
            $scope.user.userActions = userUtils.restoreUserActions($scope.user.userActions);
            dataEntryService.restore();
        }
    }

    function addDimensionConstraintForType(dataGroups) {
        var userType = getUserType();
        if (userType !== 'Inter-Agency' && userType !== 'MOH') {
            vm.userInviteObject.addDimensionConstraint(dimensionConstraint);
        }
    }

    function verifyUserInviteObject() {
        if (!userService.verifyInviteData(vm.userInviteObject)) {
            notify.error('Invite did not pass basic validation');
            vm.isProcessingAddUser = true;
            return false;
        }
        return true;
    }

    function addUserGroupsForMechanismsAndUsers() {
        //Add the all mechanisms group from the user entity
        var userType = getUserType();
        if (userType === 'MOH') {
            return true;
        }

        if (userEntityHasValidUserGroups()) {
            vm.userInviteObject.addEntityUserGroup($scope.user.userEntity.mechUserGroup);
            vm.userInviteObject.addEntityUserGroup($scope.user.userEntity.userUserGroup);

            return true;
        }

        notify.error('User groups for mechanism and users not found on selected entity');
        return false;
    }

    function addUserGroupForUserAdmin() {
        if ($scope.user.userEntity.userAdminUserGroup) {
            vm.userInviteObject.addEntityUserGroup($scope.user.userEntity.userAdminUserGroup);
            return true;
        }
        notify.error('User admin group can not be found');
        return false;
    }

    function userEntityHasValidUserGroups() {
        return $scope.user.userEntity &&
            $scope.user.userEntity.mechUserGroup &&
            $scope.user.userEntity.userUserGroup &&
            $scope.user.userEntity.mechUserGroup.id &&
            $scope.user.userEntity.userUserGroup.id;
    }

    function getUserManagerRoles() {
        var hasUserRoleId = _.compose(_.size, _.values, _.partialRight(_.pick, ['userRoleId']));
        var actionsForUserType = userActions.getActionsForUserType(getUserType());
        var userManagerRole = userActions.actions.filter(function (action) {
            return action.name === 'Manage users';
        });

        return _.chain(actionsForUserType)
            .filter(hasUserRoleId)
            .value().concat(userManagerRole);
    }

    function addUserManagerUserRoles() {
        var adminActions = _.map(getUserManagerRoles(), function (userAction) {
            return {id: userAction.userRoleId};
        });

        vm.userInviteObject.userCredentials.userRoles = vm.userInviteObject.userCredentials.userRoles.concat(adminActions);
    }

    function addAllAvailableDataStreams() {
        var dataAccessGroups = _.map(getUserManagerDataAccessGroups(), _.partialRight(_.pick, ['id']));
        vm.userInviteObject.userGroups = vm.userInviteObject.userGroups.concat(dataAccessGroups);

        var dataEntryRoles = _.map(getUserManagerDataEntryRoles(), _.compose(renameProperty('userRoleId', 'id'), _.partialRight(_.pick, ['userRoleId'])));
        vm.userInviteObject.userCredentials.userRoles = vm.userInviteObject.userCredentials.userRoles.concat(dataEntryRoles);
    }

    function renameProperty(from, to) {
        return function (item) {
            item[to] = item[from];
            delete item[from];
            return item;
        };
    }

    function getUserManagerDataAccessGroups() {
        return _.chain(vm.dataGroups)
            .map('userGroups')
            .flatten()
            .value();
    }

    function getUserManagerDataEntryRoles() {
        return userActions.getUserManagerDataEntryRoles(getUserType(), $scope.user.userEntity);
    }

    function getDataEntryRolesNotShown() {
        return userUtils.getUserRestrictionsDifference(userActions.dataEntryRestrictions[getUserType()], getUserManagerDataEntryRoles());
    }

    function validateDataGroups() {
        return validations.validateDataGroups($scope.user.dataGroups);
    }

    function getUserType() {
        return $scope.user && $scope.user.userType && $scope.user.userType.name;
    }

    function getDataGroupsForUserType(dataGroups) {
        return userUtils.getDataGroupsForUserType(dataGroups, getUserType);
    }

    function getErrorString() {
        if (!$scope.user.userType) {
            return 'Please check if you selected a user type';
        }
        if (!$scope.user.userEntity) {
            var userType = getUserType();
            if (userType === 'MOH') { }
            else if (userType === 'Partner') {
                return 'Please check if you selected a ' + userType;
            }
            else {
                return 'Please check if you selected an ' + userType;
            }
        }
        if (!$scope.user.email) {
            return 'Please check if you entered an e-mail address';
        }
        if (!validateDataGroups()) {
            return 'Make sure you selected a data stream';
        }

        return 'Invite user';
    }
}
