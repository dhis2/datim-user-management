angular.module('PEPFAR.usermanagement').controller('userListController', userListController);

function userListController(userFilter, currentUser, schemaService, dataGroupsService, userListService,  //jshint ignore:line
                            userStatusService, $state, errorHandler, userActions, userService, _) {
    var vm = this;
    var searchFieldNames = {
        name: 'name',
        username: 'userCredentials.username',
        'e-mail': 'email',
        roles: 'userCredentials.userRoles.name',
        'user role': 'userCredentials.userRoles.name',
        'user group': 'userGroups.name',
        'organisation unit': 'organisationUnits.name',
        types: 'userGroups.name'
    };

    vm.detailsOpen = false;
    vm.disabledUserFilter = null;
    vm.users = [];
    vm.pagination = userListService.pagination;
    vm.processing = {};
    vm.listIsLoading = false;
    vm.currentPage = 1;
    vm.pageChanged = pageChanged;
    vm.isUserAdministrator = currentUser.hasAllAuthority() || currentUser.isUserAdministrator();
    vm.activateUser = activateUser;
    vm.deactivateUser = deactivateUser;
    vm.isProcessing = isProcessing;
    vm.showDetails = showDetails;
    vm.detailsUser = undefined;
    vm.isDetailsUser = isDetailsUser;
    vm.getDataGroupsForUser = getDataGroupsForUser;
    vm.detailsUserDataGroups = [];
    vm.detailsUserUserType = '';
    vm.detailsUserActions = [];
    vm.detailsUserEntity = {};
    vm.doSearch = doSearch;
    vm.editUser = editUser;
    vm.placeHolder = 'Search for user';
    vm.updatePlaceholder = updatePlaceholder;
    vm.closeDetails = closeDetails;
    vm.removeFilter = removeFilter;
    vm.addFilter = addFilter;
    vm.resetFilters = resetFilters;
    vm.getEditDisabledReasons = getEditDisabledReasons;
    vm.showEditDisabledReason = showEditDisabledReason;
    vm.getCSVUrl = getCSVUrl;
    vm.isDownloadingCSV = false;
    vm.downloadAsCSV = downloadAsCSV;
    vm.setDisabledUserFilter = setDisabledUserFilter;
    vm.selectedUserMap = {};
    vm.selectedUsers = [];
    vm.isAllUsersSelected = false;
    vm.toggleSelectAll = toggleSelectAll;
    vm.onSelectedUsersChanged = onSelectedUsersChanged;
    vm.disableSelected = disableSelected;
    vm.enableSelected = enableSelected;

    vm.search = {
        options: userFilter,
        filterType: undefined,
        searchWord: '',
        doSearch: _.debounce(vm.doSearch, 500),
        activeFilters: [],
        addFilter: addFilter,
        placeHolderText: [],
        hasSecondaryFilter: hasSecondaryFilter,
        getSecondaryFilter: getSecondaryFilter
    };

    initialise();

    function initialise() {
        if (!currentUser.hasAllAuthority() && !currentUser.isUserAdministrator()) {
            console.log('YOU DO NOT HAVE ACCESS -> hasAll = ', currentUser.hasAllAuthority(), 'isAdmin = ', currentUser.isUserAdministrator(), ' currentUser = ', currentUser);
            return $state.go('noaccess', {message: 'Your user account does not seem to have the authorities to access this functionality.'});
        }
        reloadFilters();
        loadList();
    }

    function hasSecondaryFilter(filterIndex) {
        return (vm.search.activeFilters[filterIndex] && vm.search.activeFilters[filterIndex].type && vm.search.activeFilters[filterIndex].type.secondary);
    }

    function getSecondaryFilter(filterIndex) {
        if (hasSecondaryFilter(filterIndex)) {
            return vm.search.activeFilters[filterIndex].type.secondary;
        }
    }

    function setUserList(users) {
        if (users === null || users === undefined) {
            return; // this was from a timeout, take no action
        }

        vm.listIsLoading = false;
        resetSelectedUsers();
        vm.users = users;
    }

    function pageChanged() {
        vm.pagination.setCurrentPage(vm.currentPage);
        loadList();
    }

    function loadList() {
        vm.listIsLoading = true;
        userListService.getList()
            .then(setUserList)
            .catch(function () {
                vm.listIsLoading = false;
            });
    }

    function activateUser(user) {
        vm.processing[user.id] = true;

        userStatusService.enable(user.id)
            .then(function () {
                user.userCredentials.disabled = false;
                vm.processing[user.id] = false;
            })
            .catch(function () {
                vm.processing[user.id] = false;
                errorHandler.error('Unable to enable the user');
            });
    }

    function deactivateUser(user) {
        vm.processing[user.id] = true;

        userStatusService.disable(user.id)
            .then(function () {
                user.userCredentials.disabled = true;
                vm.processing[user.id] = false;
            })
            .catch(function () {
                vm.processing[user.id] = false;
                errorHandler.error('Unable to disable the user');
            });
    }

    function isProcessing(id) {
        return (vm.processing[id] && vm.processing[id] === true) ? true : false;
    }

    //TODO: Move the jQuery stuff out of the controller as it's considered bad practice.
    //      Very nice solution provided by Paul but we should move it into a directive.
    //TODO: Perhaps it would also be nice to never have it be out of sight if it is available?
    var detailsBlock = jQuery('.user-details-view');
    function showDetails(user, $event) {
        if ($event && $event.target && $event.target.nodeName === 'INPUT') { return; }

        var detailsRow = jQuery('.user-list li[user-id=' + user.id + ']');
        var detailsWrap = detailsRow.parent();
        var parentHeight = detailsWrap.innerHeight();
        var position = detailsRow.position() || {};
        var detailsBlockHeight = detailsBlock.innerHeight() || 400; //TODO: Remove this static 400 in favour of some jQuery actual height calculation

        if (parentHeight > detailsBlockHeight && (detailsBlockHeight + position.top >= parentHeight)) {
            position.top = parentHeight - detailsBlockHeight;
        }

        if (!vm.detailsOpen) {
            detailsBlock.offset({top: position.top, right: 0}); //jshint ignore:line
        } else {
            detailsBlock.css('top', position.top); //jshint ignore:line
        }

        if (user !== vm.detailsUser) {
            vm.detailsUser = user;
            vm.detailsOpen = true;
            vm.getDataGroupsForUser(user);
            vm.detailsUserUserType = schemaService.store.get('User Types', true).fromUser(user);

            vm.detailsUserEntity = {};
            userService.getUserEntity(user)
                .then(function (userEntity) {
                    vm.detailsUserEntity = userEntity || {};
                });
            userActions.getActionsForUser(user).then(function (actions) {
                vm.detailsUserActions = actions;
            });

        } else {
            closeDetails();
        }
    }

    function closeDetails() {
        vm.detailsUser = undefined;
        vm.detailsOpen = false;
    }

    function isDetailsUser(user) {
        return user === vm.detailsUser;
    }

    function getDataGroupsForUser(user) {
        schemaService.store.get('Data Groups').then(function (dataGroups) {
            vm.detailsUserDataGroups = dataGroups.fromUser(user);
        });
    }

    function updatePlaceholder($index) {
        var newVal = vm.search.filterType[$index];
        var phText = 'Search for ';
        var outputStr = '';

        if (newVal.name === 'E-Mail' || newVal.name === 'Roles') {
            outputStr = phText + 'user ';
        } else {
            outputStr = phText;
        }

        vm.search.placeHolderText[$index] = outputStr + newVal.name;
    }

    //TODO: Move the search stuff to the filter service
    function doSearch() {
        var fieldNames = searchFieldNames;

        userListService.resetFilters();

        if (vm.disabledUserFilter !== null) {
            userListService.setFilter('userCredentials.disabled:eq:' + vm.disabledUserFilter);
        }

        vm.search.activeFilters.forEach(function (filterDefinition) {
            var filter;

            //Only use valid filters
            if (!isValidFilter(filterDefinition)) { return; }

            var filtersThatRequireEquality = ['user role', 'user group'];
            var comparator = filterDefinition.comparator;
            if (filtersThatRequireEquality.indexOf(filterDefinition.type.name.toLowerCase()) >= 0) {
                comparator = 'eq';
            }

            filter = [
                fieldNames[filterDefinition.type.name.toLowerCase()],
                comparator,
                //Use the value if it is a string, otherwise check the value property and lastly use the name property
                angular.isString(filterDefinition.value) ? filterDefinition.value :
                    (filterDefinition.value.value ? filterDefinition.value.value : filterDefinition.value.name)
            ];
            userListService.setFilter(filter.join(':'));
        });
        loadList();
    }

    function isValidFilter(filterDefinition) {
        return filterDefinition &&
            filterDefinition.type &&
            filterDefinition.type.name &&
            filterDefinition.comparator &&
            filterDefinition.value;
    }

    function removeFilter($index) {
        vm.search.activeFilters.splice($index, 1);
        userListService.removeFilter($index);
        doSearch();
    }

    function addFilter() {
        if (vm.search.activeFilters.length < 5) {
            vm.search.activeFilters.push({
                id: new Date().toString(),
                type: undefined,
                value: undefined,
                comparator: 'ilike'
            });
        }
    }

    function reloadFilters() {
        var fieldNames = _.invert(searchFieldNames);

        if (userListService.getFilters().length > 0) {
            userListService.getFilters().forEach(function (item) {
                var splitFilter = item.split(':');

                var temp = {
                    id: new Date().toString(),
                    type: undefined,
                    value: undefined,
                    comparator: 'ilike'
                };

                temp.type = userFilter.reduce(function (current, filter) {
                    if (filter.name.toLowerCase() === fieldNames[splitFilter[0]]) {
                        errorHandler.debug(splitFilter[0]);
                        errorHandler.debug(fieldNames[splitFilter[0]]);
                        errorHandler.debug(filter.name.toLowerCase());

                        current = filter;
                    }
                    return current;
                }, undefined);

                temp.value = splitFilter[2];

                if (isValidFilter(temp)) {
                    errorHandler.debug('Restoring filter', temp);
                    vm.search.activeFilters.push(temp);
                }
            });
        } else {
            addNameFilter();
        }
    }

    function resetFilters() {
        vm.search.activeFilters = [];
        userListService.resetFilters();
        doSearch();

        addNameFilter();
    }

    function addNameFilter() {
        addFilter();
        vm.search.activeFilters[0].type = {name: 'Name'};
    }

    function editUser(user) {
        if (schemaService.store.get('User Types', true).fromUser(user) === 'Global') {
            $state.go('globalEdit', {userId: user.id, username: user.userCredentials.username});
            return;
        }

        if (user && user.id && user.userCredentials && user.userCredentials.username) {
            $state.go('edit', {userId: user.id, username: user.userCredentials.username});
        }
    }

    function getEditDisabledReasons(user) {
        var userTypes = schemaService.store.get('User Types', true);
        var userType = userTypes.fromUser(user);
        var currentUserType = userTypes.fromUser(currentUser);

        var isSuperUser = currentUser.hasAllAuthority();

        var errors = [];

        if (currentUser.isGlobalUser() && !isSuperUser && userType !== 'Global') {
            errors.push('"Global" user cannot edit this "' + userType + '" user');
        }

        if (currentUserType === 'MOH' && !isSuperUser && userType !== 'MOH') {
            errors.push('"MOH" user cannot edit this "' + userType + '" user');
        }

        if (user && user.id && user.id === currentUser.id) {
            errors.push('You cannot edit yourself');
        }

        if (userType === 'Unknown type') {
            errors.push('They do not conform to a known type');
        }

        var unmanagableGroups = (user.userGroups || []).filter(function (userGroup) {
            return !userGroup || !userGroup.access || !userGroup.access.manage;
        });

        // Cannot manage ANY group
        if (!isSuperUser && unmanagableGroups.length !== 0 && unmanagableGroups.length === user.userGroups.length) {
            unmanagableGroups.forEach(function (userGroup) {
                errors.push('They are a member of the "' + userGroup.name + '" group which you are not');
            });
        }

        if (!isSuperUser && user.userCredentials && user.userCredentials.userRoles) {
            var currentUserRoles = (currentUser.userCredentials && currentUser.userCredentials.userRoles) || [];
            var currentUserRolesMap = _.indexBy(currentUserRoles, 'id');

            user.userCredentials.userRoles.forEach(function (userRole) {
                if (!currentUserRolesMap[userRole.id]) {
                    errors.push('They have the role "' + userRole.name + '" which you do not');
                }
            });
        }

        return errors;
    }

    function showEditDisabledReason(user) {
        var reasons = getEditDisabledReasons(user);
        var html = 'You cannot modify this user because: <ul><li>' +
            reasons.join('</li><li>') +
            '</li></ul>';

        toastr.warning(html, undefined, { timeOut: 0, extendedTimeOut: 0 })
            .addClass('user-list-edituser-warning');
    }

    function getCSVUrl() {
        return userListService.getCSVUrl();
    }

    function downloadAsCSV() {
        vm.isDownloadingCSV = true;
        userListService.downloadAsCSV().then(function () {
            vm.isDownloadingCSV = false;
        });
    }

    function setDisabledUserFilter(disabledUsersOnly) {
        var filter = (typeof disabledUsersOnly === 'boolean' ? disabledUsersOnly : null);
        if (vm.disabledUserFilter !== filter) {
            vm.disabledUserFilter = filter;
            doSearch();
        }
    }

    function onSelectedUsersChanged() {
        vm.selectedUsers.length = 0;
        vm.selectedUsers = Object.keys(vm.selectedUserMap).reduce(function (selectedUsers, index) {
            if (vm.selectedUserMap[index] === true) {
                selectedUsers.push(vm.users[index]);
            }
            return selectedUsers;
        }, vm.selectedUsers);

        vm.isAllUsersSelected = (vm.selectedUsers.length === vm.users.length);
    }

    function toggleSelectAll() {
        if (!vm.isAllUsersSelected) {
            resetSelectedUsers();
        }
        else {
            vm.selectedUsers.length = 0;
            vm.users.forEach(function (user, index) {
                vm.selectedUserMap[index] = true;
                vm.selectedUsers.push(user);
            });
        }
    }

    function resetSelectedUsers() {
        vm.selectedUserMap = {};
        vm.selectedUsers.length = 0;
        vm.isAllUsersSelected = false;
    }

    function disableSelected() {
        vm.selectedUsers.filter(function (user) { return !user.userCredentials.disabled && user.id !== currentUser.id; }).forEach(deactivateUser);
    }

    function enableSelected() {
        vm.selectedUsers.filter(function (user) { return user.userCredentials.disabled && user.id !== currentUser.id; }).forEach(activateUser);
    }
}
