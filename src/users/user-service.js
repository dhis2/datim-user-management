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

        var x = -1;
        var addAggregate = false;

        x = findItem('Data Entry PRIME Country Team', 'pZ7VasdvIQI', inviteObject.userCredentials.userRoles);
        if (x >= 0) {
            console.log('Fixing invite for Inter-Agency user');
            //Add Data PRIME Country Team entry user group and remove role
            inviteObject.userGroups.push({id: 'zY2t7de7Jzz'});
            inviteObject.userCredentials.userRoles.splice(x, 1);
            addAggregate = true;
        }

        x = findItem('Data Entry PRIME DOD', 'MvL2QQbjryY', inviteObject.userCredentials.userRoles);
        if (x >= 0) {
            console.log('Fixing invite for PRIME DoD user');
            //Add Data PRIME DoD entry user group and remove role
            inviteObject.userGroups.push({id: 'rP0VPKQcC8y'});
            inviteObject.userCredentials.userRoles.splice(x, 1);
            addAggregate = true;
        }

        x = findItem('Data Entry PRIME', 'hXjy7MsnbhZ', inviteObject.userCredentials.userRoles);
        if (x >= 0) {
            console.log('Fixing invite for regular PRIME user');
            //Add Data PRIME entry user group and remove role
            inviteObject.userGroups.push({id: 'hCofOhr3q1Q'});
            inviteObject.userCredentials.userRoles.splice(x, 1);
            addAggregate = true;
        }

        x = findItem('Data Entry SaS', 'emeQ7kjx8Ve', inviteObject.userCredentials.userRoles);
        if (x >= 0) {
            console.log('Fixing invite for SaS');
            //Add Data SaS entry user group and remove role
            inviteObject.userGroups.push({id: 'AZU9Haopetn'});
            inviteObject.userCredentials.userRoles.splice(x, 1);
        }

        x = findItem('Data Entry ER', 'ddefz0KIAtO', inviteObject.userCredentials.userRoles);
        if (x >= 0) {
            console.log('Fixing invite for ER');
            //Add Data ER entry user group and remove role
            inviteObject.userGroups.push({id: 'XgctRYBpSiR'});
            inviteObject.userCredentials.userRoles.splice(x, 1);
            addAggregate = true;
        }

        if (addAggregate) {
            inviteObject.userCredentials.userRoles.push({id: 'k7BWFXkG6zt'});
        }

        if (findItem('Data SaS access', 'CwFniyubXbx', inviteObject.userGroups) >= 0) {
            inviteObject.userCredentials.userRoles.push({id: 'NsYYVxduOTM'});
        }

        removeDummyRoles(inviteObject);

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
                fullMunge(user);
                return user;
            });
    }

    function fullMunge(user) {
        var munging = findItem('Data PRIME access', 'c6hGi8GEZot', user.userGroups);
        if (munging >= 0) {
            if (munge(user, munging, 'Data PRIME Country Team entry', 'Data Entry PRIME Country Team', 'pZ7VasdvIQI')) {
                console.log('Converted Data PRIME Country Team entry user');
            } else if (munge(user, munging, 'Data PRIME DoD entry', 'Data Entry PRIME DOD', 'MvL2QQbjryY')) {
                console.log('Converted Data PRIME DoD entry user');
            } else if (munge(user, munging, 'Data PRIME entry', 'Data Entry PRIME', 'hXjy7MsnbhZ')) {
                console.log('Converted Data PRIME entry user');
            } else {
                console.log('Data PRIME access user—nothing to do');
            }
        }
        mungeMore('SaS', 'AZU9Haopetn', 'emeQ7kjx8Ve', user);
        mungeMore('ER', 'XgctRYBpSiR', 'ddefz0KIAtO', user);
        mungeRemoveAggregate(user);
        removeHiddenGroups(user);
    }

    function munge(user, i, newname, oldname, olduid) {
        var x = findItem(newname, false, user.userGroups);
        if (x === -1) {
            return false;
        }
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

    function mungeMore(name, entryUid, dummyUid, user) {
        var munging = findItem('Data ' + name + ' entry', entryUid, user.userGroups);
        if (munging === -1) {
            return false;
        }
        console.log('munging ' + name);
        user.userCredentials.userRoles.push({
            'name': 'Data Entry ' + name,
            'id': dummyUid,
            'displayName': 'Data Entry ' + name
        });
        return true;
    }

    function mungeRemoveAggregate(user) {
        var x = findItem('Data Entry Aggregate', 'k7BWFXkG6zt', user.userCredentials.userRoles);
        if (x === -1) {
            return false;
        }
        if (findItem('User Administrator', 'KagqnetfxMr', user.userCredentials.userRoles) < 0 &&
            findItem('Data PRIME entry', 'hCofOhr3q1Q', user.userGroups) < 0 &&
            findItem('Data PRIME DoD entry', 'rP0VPKQcC8y', user.userGroups) < 0 &&
            findItem('Data PRIME Country Team entry', 'zY2t7de7Jzz', user.userGroups) < 0 &&
            findItem('Data SaS entry', 'AZU9Haopetn', user.userGroups) < 0 &&
            findItem('Data ER entry', 'XgctRYBpSiR', user.userGroups) < 0) {
                user.userCredentials.userRoles.splice(x, 1);
        }
    }

    function removeHiddenGroups(user) {
        removeAllFromCollection(user.userGroups, 'hCofOhr3q1Q');
        removeAllFromCollection(user.userGroups, 'rP0VPKQcC8y');
        removeAllFromCollection(user.userGroups, 'zY2t7de7Jzz');
        removeAllFromCollection(user.userGroups, 'AZU9Haopetn');
        removeAllFromCollection(user.userGroups, 'XgctRYBpSiR');
    }

    function removeAllFromCollection(collection, uid) {
        var x = findItem('', uid, collection);
        while (x >= 0) {
            collection.splice(x, 1);
            x = findItem('', uid, collection);
        }
    }
    
    function unmunge(user, i, oldname, olduid, newname, newuid) {
        var x = findItem(oldname, olduid, user.userCredentials.userRoles);
        if (x === -1) {
            return false;
        }
        user.userCredentials.userRoles.splice(x, 1);
        if (newname) {
            user.userGroups.push({
                'name': newname,
                'id': newuid,
                'displayName': newname
            });
        }
        unmungeAddAggregate(user);
        return true;
    }

    function unmungeAddAggregate(user) {
        user.userCredentials.userRoles.push({
            'name': 'Data Entry Aggregate',
            'id': 'k7BWFXkG6zt',
            'displayName': 'Data Entry Aggregate'
        });
    }
    
    function unmungeMore(name, entryUid, dummyUid, user) {
        console.log('unmunging ' + name);
        var unmunging = findItem('Data Entry ' + name, dummyUid, user.userCredentials.userRoles);
        if (unmunging !== -1) {
            user.userCredentials.userRoles.splice(unmunging, 1);
            user.userGroups.push({
                'name': 'Data ' + name + ' entry',
                'id': entryUid,
                'displayName': 'Data ' + name + ' entry'
            });
            unmungeAddAggregate(user);
        } else {
            unmunging = findItem('Data ' + name + ' entry', entryUid, user.userGroups);
            if (unmunging !== -1) {
                user.userGroups.splice(unmunging, 1);
            }
        }
        return true;
    }

    function removeDummyRoles(user) {
        removeAllFromCollection(user.userCredentials.userRoles, 'hXjy7MsnbhZ');
        removeAllFromCollection(user.userCredentials.userRoles, 'MvL2QQbjryY');
        removeAllFromCollection(user.userCredentials.userRoles, 'pZ7VasdvIQI');
        removeAllFromCollection(user.userCredentials.userRoles, 'emeQ7kjx8Ve');
        removeAllFromCollection(user.userCredentials.userRoles, 'ddefz0KIAtO');
    }

    function findItem(itemName, itemUid, items) {
        if (Array.isArray(items)) {
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

            var unmunging = findItem('Data PRIME access', 'c6hGi8GEZot', userToUpdate.userGroups);
            if (unmunging >= 0) {
                if (unmunge(userToUpdate, unmunging, 'Data Entry PRIME Country Team', false, 'Data PRIME Country Team entry', 'zY2t7de7Jzz')) {
                    console.log('Unconverted Data PRIME Country Team entry user');
                } else if (unmunge(userToUpdate, unmunging, 'Data Entry PRIME DOD', false, 'Data PRIME DoD entry', 'rP0VPKQcC8y')) {
                    console.log('Unconverted Data PRIME DoD entry user');
                } else if (unmunge(userToUpdate, unmunging, 'Data Entry PRIME', false, 'Data PRIME entry', 'hCofOhr3q1Q')) {
                    console.log('Unconverted Data PRIME entry user');
                } else {
                    console.log('Data PRIME access user—nothing to do');
                }
            }

            unmungeMore('SaS', 'AZU9Haopetn', 'emeQ7kjx8Ve', userToUpdate);
            unmungeMore('ER', 'XgctRYBpSiR', 'ddefz0KIAtO', userToUpdate);
            removeDummyRoles(userToUpdate);

            var value = userToUpdate.save().then(function() {
                fullMunge(userToUpdate);
            });
            return value;
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
