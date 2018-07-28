angular.module('PEPFAR.usermanagement').factory('userService', userService);

function userService($q, Restangular, userUtils, schemaService, errorHandler, dataEntryService) {
    var userInviteObjectStructure = {
        email:'',
        organisationUnits:[
            //{'id':'ybg3MO3hcf4'}
        ],
        dataViewOrganisationUnits:[
            //{'id':'ybg3MO3hcf4'}
        ],
        userGroups: [
            //{'id':'iuD8wUFz95X'},
            //{'id':'gh9tn4QBbKZ'}
        ],
        userCredentials:{
            userRoles:[
                //{'id':'b2uHwX9YLhu'}
            ]
        }
    };

    return {
        getUserObject: getUserObject,
        getUserInviteObject: getUserInviteObject,
        inviteUser: inviteUser,
        verifyInviteData: verifyInviteData,
        saveUserLocale: saveUserLocale,
        getSelectedDataGroups: getSelectedDataGroups,
        getUser: getUser,
        getUserEntity: getUserEntity,
        getUserLocale: getUserLocale,
        updateUser: updateUser
    };

    function getUserObject() {
        return angular.copy({
            userType: undefined,
            userEntity: undefined,
            email: undefined,
            locale: {name: 'en', code: 'en'},
            userActions: {},
            userGroups: [],
            userRoles: [],
            dataGroups: {}
        });
    }

    function getInviteObject() {
        var inviteObject = Object.create(getUserInviteProto());
        return angular.extend(inviteObject, angular.copy(userInviteObjectStructure));
    }

    function getUserInviteProto() {
        return {
            addDimensionConstraint: addDimensionConstraint,
            addEmail: addEmail,
            addEntityUserGroup: addEntityUserGroup
        };

        function addDimensionConstraint(dimension) {
            if (!this.userCredentials.catDimensionConstraints) {
                this.userCredentials.catDimensionConstraints = [];
            }
            if (dimension && dimension.id) {
                this.userCredentials.catDimensionConstraints.push({id: dimension.id});
            }

        }

        function addEmail(email) {
            this.email = email;
        }

        function addEntityUserGroup(userGroup) {
            this.userGroups = this.userGroups || [];

            if (userGroup && userGroup.id) {
                this.userGroups.push({id: userGroup.id});
            }
        }
    }

    function getUserInviteObject(user, dataGroups, allActions, organisationUnits, dataEntryRestrictions) {
        var inviteObject = getInviteObject();
        var selectedDataGroups = getSelectedDataGroups(user, dataGroups);
        var actions = getActionsForGroups(user, selectedDataGroups, allActions);
        //Add the usergroups to the invite object
        selectedDataGroups.forEach(function (dataGroup) {
            inviteObject.userGroups = inviteObject.userGroups.concat(dataGroup.userGroups.map(function (userGroup) {
                return {id: userGroup.id};
            }));
        });

        //Adds data entry roles to the user credentials
        Object.keys(dataEntryService.dataEntryRoles)
            .filter(function (dataEntryKey) { return dataEntryService.dataEntryRoles[dataEntryKey] === true; })
            .forEach(function (dataEntryKey) {
                var dataEntryUserRoles = dataEntryRestrictions[user.userType.name][dataEntryKey] || [];
                dataEntryUserRoles.forEach(function (dataEntryUserRole) {
                    var userRoleId = dataEntryUserRole.userRoleId;
                    if (userRoleId) {
                        inviteObject.userCredentials.userRoles.push({id: userRoleId});
                    }
                });
            });

        //Add the user actions to the invite object
        actions.forEach(function (action) {
            if (action.userRoleId) {
                inviteObject.userCredentials.userRoles.push({id: action.userRoleId});
            }
        });

        //Unmunge invite if the uid for Data PRIME access appears
        if (user.userType !== undefined && findItem('Data PRIME access', 'c6hGi8GEZot', inviteObject.userGroups) >= 0) {
            if (user.userType.name == 'Inter-Agency' && findItem('Data Entry Aggregate', 'k7BWFXkG6zt', inviteObject.userCredentials.userRoles) >= 0) {
                console.log('Fixing invite for Inter-Agency user');
                //Add Data PRIME Country Team entry user group
                inviteObject.userGroups.push({id: 'zY2t7de7Jzz'});
            } else if (user.userType.name == 'Partner' && findItem('Data Entry Aggregate', 'k7BWFXkG6zt', inviteObject.userCredentials.userRoles) >= 0) {
                console.log('Fixing invite for Partner user');
                //Add Data PRIME entry user group
                inviteObject.userGroups.push({id: 'hCofOhr3q1Q'});
            }
        }

        organisationUnits = (Array.isArray(organisationUnits) && organisationUnits) || [];

        inviteObject.organisationUnits = (organisationUnits).map(function (orgUnit) {
            return {id: orgUnit.id};
        });
        inviteObject.dataViewOrganisationUnits = organisationUnits.map(function (orgUnit) {
            return {id: orgUnit.id};
        });

        inviteObject.addEmail(user.email);

        return inviteObject;
    }

    function getSelectedActions(user) {
        var userActions = (user && user.userActions) || [];

        return Object.keys(userActions).filter(function (key) {
            return this[key];
        }, userActions);
    }

    function getSelectedDataGroupNames(user) {
        var dataGroups = (user && user.dataGroups) || {};
        return Object.keys(dataGroups).filter(function (key) {
            return this[key] && this[key].access === true;
        }, dataGroups);
    }

    function getSelectedDataGroups(user, dataGroups) {
        var selectedDataGroupNames = getSelectedDataGroupNames(user);

        return (dataGroups || []).filter(function (dataGroup) {
            return selectedDataGroupNames.indexOf(dataGroup.name) >= 0;
        });
    }

    function getActionsForGroups(user, selectedDataGroups, actions) {
        var selectedActions = getSelectedActions(user);

        return selectedDataGroups.map(function (dataGroup) {
            return actions.map(function (action) {

                if (action.typeDependent === true) {
                    action.userRole = action.userRole.replace(/{{.+}}/, dataGroup.name);
                }
                dataGroup.userRoles.forEach(function (userRole) {
                    if (action.userRole === userRole.name) {
                        action.userRoleId = userRole.id;
                    }
                });

                return action;
            });
        })
        .reduce(function (actions, current) {
            if (angular.isArray(actions)) { actions = []; }

            return actions.concat(current);
        }, actions)
        .filter(function (action) {
            if (((selectedActions.indexOf(action.name) >= 0) || action.default === true)) {
                return true;
            }
            return false;
        });
    }

    function inviteUser(inviteData) {
        if (!angular.isObject(inviteData) && !null) {
            return $q.reject('Invalid invite data');
        }

        return Restangular
            .all('users')
            .all('invite')
            .post(inviteData)
            .then(function (response) {
                if (!response || !response.uid) {
                    return $q.reject(new Error('Invite response not as expected'));
                }

                return Restangular
                    .all('users')
                    .get(response.uid, {fields: ':owner,userCredentials[:owner]'});
            })
            .catch(function (error) {

                if (angular.isString(error)) {
                    return $q.reject(error);
                }
                return $q.reject('Invite failed');
            });
    }

    function verifyInviteData(inviteObject) {
        if (verifyEmail(inviteObject.email) && verifyOrganisationUnits(inviteObject) &&
            verifyUserRoles(inviteObject.userCredentials) && verifyUserGroups(inviteObject.userGroups)) {
            return true;
        }
        return false;
    }

    function verifyEmail(email) {
        if (email) {
            return true;
        }
        return false;
    }

    function verifyOrganisationUnits(inviteObject) {
        if ((inviteObject.organisationUnits.length > 0 && inviteObject.organisationUnits[0].id) &&
            inviteObject.dataViewOrganisationUnits.length > 0 &&  inviteObject.dataViewOrganisationUnits[0].id) {
            return true;
        }
        return false;
    }

    function verifyUserRoles(userCredentials) {
        if (userCredentials && userCredentials.userRoles && userCredentials.userRoles.length > 0) {
            return true;
        }
        return false;
    }

    function verifyUserGroups(groups) {
        if (Array.isArray(groups) && groups.length > 0) {
            return true;
        }
        return false;
    }

    function saveUserLocale(username, locale) {
        if (username === undefined || username === '') {
            throw new Error('Username required');
        }

        if (locale === undefined || locale === '') {
            throw new Error('Locale required');
        }

        return Restangular.one('userSettings')
            .one('keyUiLocale')
            .post(undefined, locale.trim(), {user: username}, {'Content-Type': 'text/plain'})
            .then(function () {
                return locale;
            });
    }

    function getUserLocale(userName) {
        var deferred = $q.defer();

        Restangular
            .all('userSettings')
            .get('keyUiLocale', {user: userName}, {Accept: 'text/plain'})
            .then(function (locale) {
                deferred.resolve({
                    name: locale,
                    code: locale
                });
            })
            .catch(function () {
                deferred.resolve(undefined);
            });

        return deferred.promise;
    }

    function getUser(userId) {
        return Restangular
            .all('users')
            .get(userId, {
                fields: [
                    ':all',
                    'organisationUnits[id,name,displayName],userGroups[id,displayName,name]',
                    'userCredentials[id,username,disabled,userRoles[id,name,displayName],catDimensionConstraints,cogsDimensionConstraints]'
                ].join(',')
            })
            .then(function(user) {
                var munging = findItem('Data PRIME access', 'c6hGi8GEZot', user.userGroups);
                if (munging >= 0) {
                    console.log('munging');
                    if (munge(user, munging, 'Data PRIME Country Team entry', 'Data Entry PRIME Country Team', 'yYOqiMTxAOF')) {
                        console.log('Converted Data PRIME Country Team entry user');
                    } else if (munge(user, munging, 'Data PRIME DoD entry', 'Data Entry PRIME DOD', 'MvL2QQbjryY')) {
                        console.log('Converted Data PRIME DoD entry user');
                    } else if (munge(user, munging, 'Data PRIME entry', false, false)) {
                        console.log('Converted Data PRIME entry user');
                    } else {
                        mungeAccess(user, munging);
                        console.log('Converted Data PRIME access user');
                    }
                }
                return user;
            });
    }

    function munge(user, i, newname, oldname, olduid) {
        console.log('munging ' + newname + ' to ' + oldname);
        var x = findItem(newname, false, user.userGroups);
        if (x === -1) {
            return false;
        }
        mungeAccess(user, i);
        user.userGroups.splice(x, 1);
        if (oldname) {
            user.userCredentials.userRoles.push({
                'name': oldname,
                'id': olduid,
                'displayName': oldname
            });
        }
        return true;
    }

    function mungeAccess(user, i) {
        var x = findItem('Data Entry Aggregate', 'k7BWFXkG6zt', user.userCredentials.userRoles);
        if (x !== -1) {
            user.userCredentials.userRoles[x].name = 'Data Entry PRIME';
            user.userCredentials.userRoles[x].displayName = 'Data Entry PRIME';
        }
    }

    function unmunge(user, i, oldname, olduid, newname, newuid) {
        console.log('unmunging ' + oldname + ' back to ' + newname);
        var x = findItem(oldname, olduid, user.userCredentials.userRoles);
        if (x === -1) {
            return false;
        }
        unmungeAccess(user, i);
        user.userCredentials.userRoles.splice(x, 1);
        if (newname) {
            user.userGroups.push({
                'name': newname,
                'id': newuid,
                'displayName': newname
            });
        }
        return true;
    }

    function unmungeAccess(user, i) {
        var x = findItem('Data Entry PRIME', 'k7BWFXkG6zt', user.userCredentials.userRoles);
        if (x !== -1) {
            user.userCredentials.userRoles[x].name = 'Data Entry Aggregate';
            user.userCredentials.userRoles[x].displayName = 'Data Entry Aggregate';
        }
    }
    
    function findItem(itemName, itemUid, items) {
        if (items !== undefined && Array.isArray(items)) {
            for (var i = 0, len = items.length; i < len; i++) {
                if (items[i].name === itemName || items[i].id === itemUid) {
                    return i;
                }
            }
        }
        return -1;
    }

    function updateUser(userToUpdate) {
        return getUserEntity(userToUpdate).then(function (userEntity) {
            var userAdminGroupName = userEntity && userEntity.userAdminUserGroup && userEntity.userAdminUserGroup.name;

            userEntity = userEntity || {};

            if (userUtils.hasUserRole(userToUpdate, {name: 'User Administrator'})) {
                if (userEntity && userEntity.userAdminUserGroup && !userUtils.hasUserGroup(userToUpdate, userEntity.userAdminUserGroup)) {
                    userToUpdate.userGroups.push(userEntity.userAdminUserGroup);
                }
            } else {
                userToUpdate.userGroups = userToUpdate.userGroups.filter(function (userGroup) {
                    return userGroup.name !== userAdminGroupName;
                });
            }

            console.log('saving the user');
            var userToUnmunge = angular.copy(userToUpdate);
            var unmunging = findItem('Data PRIME access', 'c6hGi8GEZot', userToUnmunge.userGroups);
            if (unmunging >= 0) {
                console.log('unmunging');
                if (unmunge(userToUnmunge, unmunging, 'Data Entry PRIME Country Team', false, 'Data PRIME Country Team entry', 'zY2t7de7Jzz')) {
                    console.log('Unconverted Data PRIME Country Team entry user');
                } else if (unmunge(userToUnmunge, unmunging, 'Data Entry PRIME DOD', false, 'Data PRIME DoD entry', 'rP0VPKQcC8y')) {
                    console.log('Unconverted Data PRIME DoD entry user');
                } else if (unmunge(userToUnmunge, unmunging, 'Data Entry PRIME', false, false, false)) {
                    console.log('Unconverted Data PRIME entry user');
                } else {
                    unmungeAccess(userToUnmunge, unmunging);
                    console.log('Unconverted Data PRIME access user');
                }
            }

            return userToUnmunge.save();
        });
    }

    function getUserEntity(user) {
        var organisationUnit = user && Array.isArray(user.organisationUnits) && user.organisationUnits[0] || undefined;

        function returnValue(value) {
            return value;
        }

        function returnEmptyArray() {
            return [];
        }

        return $q.all([
                schemaService.store.get('Partners in Organisation', organisationUnit),
                schemaService.store.get('Agencies in Organisation', organisationUnit),
                schemaService.store.get('Interagency Groups', organisationUnit)
            ])
            .then(function (responses) {
                return (responses[0] || [])
                    .concat(responses[1] || [])
                    .concat([responses[2]]);
            })
            .then(function (partnersAndAgencies) {
                var userEntity = partnersAndAgencies.reduce(function (current, partnerAgency) {
                    if (partnerAgency && partnerAgency.userUserGroup && partnerAgency.userAdminUserGroup &&
                        partnerAgency.userUserGroup.name && partnerAgency.userAdminUserGroup.id &&
                        userUtils.hasUserGroup(user, partnerAgency.userUserGroup)) {
                        return partnerAgency;
                    }
                    return current;
                }, undefined);
                return userEntity;
            })
            .catch(function (error) {
                errorHandler.debug('User entity could not be determined due to:', error);
                return $q.reject(error);
            });
    }
}
