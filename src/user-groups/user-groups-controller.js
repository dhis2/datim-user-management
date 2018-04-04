angular.module('PEPFAR.usermanagement').controller('userGroupsController', userGroupsController);

function userGroupsController(currentUser, userGroups, userGroupsService, $state, errorHandler, schemaService, _) {
    var vm = this;

    vm.selectedGroup = null
    vm.userGroups = userGroups || [];
    vm.newGroup = null;
    vm.isCommitting = false;

    vm.isCreating = isCreating;
    vm.isCurrentUser = isCurrentUser;
    vm.isSelected = isSelected;
    vm.getGroupContext = getGroupContext;
    vm.setSelectedGroup = setSelectedGroup;
    vm.removeGroupUser = removeGroupUser;
    vm.commitGroup = commitGroup;

    resetNewGroup();

    return vm;

    function isCreating() {
        return vm.selectedGroup == null;
    }

    function isCurrentUser(user) {
        return user.id === currentUser.id;
    }

    function isSelected(group) {
        return vm.selectedGroup && group && vm.selectedGroup.id === group.id;
    }

    function getGroupContext() {
        return isCreating() ? vm.newGroup : vm.selectedGroup;
    }

    function setSelectedGroup(group) {
        if (group === null) {
            vm.selectedGroup = null;
            return;
        }

        vm.selectedGroup = angular.extend({}, group);
        vm.selectedGroup.displayName = vm.selectedGroup.name = vm.selectedGroup.name.replace(/ \(DATIM\)$/, '');
    }

    function resetNewGroup() {
        vm.newGroup = {
            users: [{ id: currentUser.id, name: currentUser.name }]
        };
    }

    function removeGroupUser(user) {
        var target = vm.isCreating() ? vm.selectedGroup : vm.newGroup;
        var index = target.users.indexOf(user);
        if (index !== -1 && !isCurrentUser(user)) {
            target.users.splice(index, 1);
        }
    }

    function commitGroup() {
        vm.isCommitting = true;

        var group = isCreating() ? vm.newGroup : vm.selectedGroup;

        var method = group.id ? 'updateGroup' : 'createGroup';
        var clone = angular.extend({}, group);
        clone.displayName = clone.name = clone.name + ' (DATIM)';

        userGroupsService[method](clone)
            .then(function () { location.reload(); })
            .catch(function (err) {
                vm.isCommitting = false;
                var msg = ((err && err.message ? err.message : err) || '').toString();
                errorHandler.error('Error saving group ' + msg);
            });
    }
}