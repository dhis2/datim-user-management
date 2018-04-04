angular.module('PEPFAR.usermanagement').controller('globalUserEditController', globalUserEditController);

function globalUserEditController(notify, userGroups, userActions, userToEdit, userLocale, userUtils, userService, schemaService, $q) {
    'use strict';
    /*jshint validthis: true*/
    var vm = this;

    var allUserActions = { 'Manage users': userUtils.hasUserAdminRights(userToEdit) };

    //Properties
    vm.user = {
        email: userToEdit.email,
        locale: userLocale,
        userActions: allUserActions
    };
    vm.isProcessing = false;
    vm.userToEdit = userToEdit;

    //Methods
    vm.getErrorString = getErrorString;
    vm.editUser = editUser;
    vm.changeUserStatus = changeUserStatus;
    vm.getUserType = getUserType;
    vm.getOrganisationUnitForUserToEdit = getOrganisationUnitForUserToEdit;

    window.console.log('Global user edit', vm.userToEdit);
    window.console.log(userGroups);

    function getErrorString() {
        return 'Save user';
    }

    function getUserType() {
        return schemaService.store.get('User Types', true).fromUser(userToEdit);
    }

    function changeUserStatus() {
        if (vm.userToEdit && vm.userToEdit.userCredentials) {
            vm.userToEdit.userCredentials.disabled = vm.userToEdit.userCredentials.disabled ? false : true;
        }
    }

    function getOrganisationUnitForUserToEdit() {
        if (userToEdit.organisationUnits && userToEdit.organisationUnits[0] && userToEdit.organisationUnits[0].name) {
            return userToEdit.organisationUnits[0].name;
        }
        return 'Unknown';
    }

    function editUser() {
        var userManagementAction = userActions.actions
            .reduce(function (current, role) { return role.name === 'Manage users' ? role : current; }, undefined);

        if (vm.user.userActions['Manage users']) {
            if (!userUtils.hasUserGroup(vm.userToEdit, userGroups.userAdminUserGroup)) {
                vm.userToEdit.userGroups.push(userGroups.userAdminUserGroup);
            }

            if (!userUtils.hasUserRole(vm.userToEdit, {name: 'User Administrator'})) {
                vm.userToEdit.userCredentials.userRoles.push({id: userManagementAction.userRoleId});
            }
        } else {
            if (userUtils.hasUserGroup(vm.userToEdit, userGroups.userAdminUserGroup)) {
                vm.userToEdit.userGroups = vm.userToEdit.userGroups.filter(function (userGroup) {
                    return userGroups.userAdminUserGroup.id !== userGroup.id;
                });
            }

            if (userUtils.hasUserRole(vm.userToEdit, {name: 'User Administrator'})) {
                vm.userToEdit.userCredentials.userRoles = vm.userToEdit.userCredentials.userRoles.filter(function (userRole) {
                    return userManagementAction.userRoleId !== userRole.id;
                });
            }
        }

        vm.isProcessing = true;

        $q.all([userToEdit.save(), vm.user.locale && vm.user.locale.code && userService.saveUserLocale(userToEdit.userCredentials.username, vm.user.locale && vm.user.locale.code)])
            .then(function (responses) {
                window.console.log(responses);
                notify.success('User updated');
            })
            .catch(function () {
                notify.error('Request to update user not processed correctly');
            })
            .finally(function () {
                vm.isProcessing = false;
            });
    }
}
