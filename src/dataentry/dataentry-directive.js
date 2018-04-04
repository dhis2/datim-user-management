angular.module('PEPFAR.usermanagement').directive('umDataEntry', dataEntryDirective);

function dataEntryDirective() {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            isUserManager: '=',
            user: '=',
            userType: '=',
            userToEdit: '='
        },
        bindToController: true,
        controller: umDataEntryController,
        controllerAs: 'umDataEntryCtrl',
        templateUrl: 'dataentry/dataentry.html'
    };

    function umDataEntryController($q, $scope, userActionsService, schemaService, userService,
                                   userUtils, notify, errorHandler, dataEntryService) {
        var vm = this;

        vm.updateDataEntry = updateDataEntry;
        vm.dataEntryRoles = dataEntryService;

        function updateDataEntry(dataEntryName) {
            var streamName = vm.userActions.getDataStreamKey(dataEntryName);
            var userGroupsThatApplyForDataEntryForUserType = vm.userActions
                    .getDataEntryRestrictionDataGroups(vm.userType || vm.user.userType.name);

            if (!angular.isString(dataEntryName)) {
                errorHandler.debug('Update data entry the streamname given is invalid');
                return;
            }

            if (userGroupsThatApplyForDataEntryForUserType.indexOf(dataEntryName) >= 0) {
                //If data entry is given, also give the stream access
                if (dataEntryName && vm.user.dataGroups[streamName]) {
                    if (vm.user.dataGroups[streamName].access === false) {
                        vm.user.dataGroups[streamName].access = true;
                    }
                }
            }
        }

        function initialise() {
            $q.all([schemaService.store.get('Current User'), userActionsService.getActions()])
                .then(function (responses) {
                    vm.currentUser = responses[0];
                    vm.userActions = responses[1];
                    dataEntryService.userActions = vm.userActions;
                })
                .then(registerWatch)
                .catch(function () {
                    notify.error('Error while loading data for the data entry directive');
                });
        }

        function registerWatch() {
            if (vm.userType) {
                $q(function (resolve, reject) {
                    if (vm.userType === 'Partner') {
                        return userService.getUserEntity(vm.userToEdit)
                            .then(function (userEntity) {
                                return function (dataEntryStreams) {
                                    return filterDataEntryStreamsForUserEntity(userEntity, dataEntryStreams);
                                };
                            })
                            .then(resolve)
                            .catch(reject);
                    }
                    resolve(function (dataEntryStreams) {
                        return dataEntryStreams;
                    });
                })
                .then(handleDataEnty)
                .catch(errorHandler.error);
            } else {
                //Register a watch for the invite screen since usertype is subject to changes
                //TODO: See if we can do this without a watch
                $scope.$watch(function () {
                    return vm.user.userType && vm.user.userType.name + (vm.user.userEntity && vm.user.userEntity.name);
                }, function (newVal, oldVal) {
                    if (newVal !== oldVal && newVal && vm.user.userType.name) {
                        if (vm.user.userType.name === 'Partner') {
                            var dataEntryTypes = [];

                            if (vm.user.userEntity && vm.user.userEntity.name) {
                                dataEntryTypes = userUtils.getDataEntryStreamNamesForUserType(vm.currentUser, vm.userActions, vm.user.userType.name);

                                dataEntryTypes = filterDataEntryStreamsForUserEntity(vm.user.userEntity, dataEntryTypes);
                            }
                            switchOffUnavailableDataEntry(vm.user.userEntity);
                            vm.dataEntryStreamNamesForUserType = dataEntryTypes;
                        } else {
                            vm.dataEntryStreamNamesForUserType = userUtils.getDataEntryStreamNamesForUserType(vm.currentUser, vm.userActions, vm.user.userType.name);
                        }
                    }
                });
            }

            function switchOffUnavailableDataEntry(userEntity) {
                var isManager = $scope.isUserManager === true || $scope.isUserManager === 'true';
                var userType = vm.user.userType.name;

                var dataEntryRestrictions = vm.userActions[isManager ? 'dataEntryRestrictions' : 'dataEntryRestrictionsUserManager'];
                var dataEntryNames = Object.keys(dataEntryRestrictions[userType] || {});

                Object.keys(dataEntryService.dataEntryRoles || {}).forEach(function (key) {
                    var falseify = (dataEntryNames.indexOf(key) === -1 || !vm.userActions.isDataEntryApplicableToUser(userEntity));
                    if (falseify) {
                        dataEntryService.dataEntryRoles[key] = false;
                    }
                });

                return userEntity;
            }

            function filterDataEntryStreamsForUserEntity(userEntity, dataEntryStreams) {
                errorHandler.debug('===================================');
                errorHandler.debug(userEntity);
                errorHandler.debug(userEntity.dodEntry);
                errorHandler.debug(userEntity.normalEntry);
                errorHandler.debug('===================================');

                return dataEntryStreams
                    .filter(function (name) {
                        return vm.userActions.isDataEntryApplicableToUser(name, userEntity);
                    });
            }

            function handleDataEnty(dataEntryFilterer) {
                var dataEntryStreams = userUtils.getDataEntryStreamNamesForUserType(vm.currentUser, vm.userActions, vm.userType);

                vm.dataEntryStreamNamesForUserType = dataEntryFilterer(dataEntryStreams);

                var userRoleIds = vm.userToEdit.userCredentials.userRoles.map(function (userRole) {
                    return userRole.id;
                });

                Object.keys(vm.userActions.dataEntryRestrictions[vm.userType] || {}).forEach(function (dataEntryName) {
                    var hasEntryRolesRequired = vm.userActions.dataEntryRestrictions[vm.userType][dataEntryName].every(function (expectedRole) {
                        return userRoleIds.indexOf(expectedRole.userRoleId) >= 0;
                    });

                    if (hasEntryRolesRequired) {
                        dataEntryService.dataEntryRoles[dataEntryName] = true;
                    }
                });
            }
        }

        initialise();
    }
}
