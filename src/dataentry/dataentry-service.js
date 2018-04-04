angular.module('PEPFAR.usermanagement').factory('dataEntryService', dataEntryService);

function dataEntryService() {
    var dataEntryRoles = {};
    var dataEntryRolesCache = [];

    return {
        userActions: {},
        dataEntryRoles: dataEntryRoles,
        reset: reset,
        restore: restore,
        hasDataEntryForStream: hasDataEntryForStream,
        setAllDataEntry: setAllDataEntry
    };

    function hasDataEntryForStream(streamName) {
        var key = this.userActions.getDataStreamKey(streamName) || streamName;
        return (dataEntryRoles[key] == true);
    }

    function reset() {
        Object.keys(dataEntryRoles).forEach(function (dataEntryKey) {
            delete dataEntryRoles[dataEntryKey];
        });
    }

    function restore() {
        reset();
        dataEntryRolesCache.forEach(function (dataEntryKey) {
            dataEntryRoles[dataEntryKey] = true;
        });
    }

    function setAllDataEntry(userType, userEntity) {
        if (!angular.isString(userType)) {
            throw new Error('Passed usertype should be a string');
        }

        dataEntryRolesCache = [];
        Object.keys(dataEntryRoles).forEach(function (dataEntryKey) {
            if (dataEntryRoles[dataEntryKey] === true) {
                dataEntryRolesCache.push(dataEntryKey);
            }
        });

        Object.keys(this.userActions.dataEntryRestrictions[userType] || {})
            .forEach(function (name) {
                // TODO: Verify - original logic also discriminated against userType
                var isApplicable = this.userActions.isDataEntryApplicableToUser(name, userEntity);
                if (isApplicable) {
                    dataEntryRoles[name] = true;
                }
            }.bind(this));
    }
}
