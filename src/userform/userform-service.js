angular.module('PEPFAR.usermanagement').factory('userFormService', userFormService);

function userFormService(userService) {
    return {
        getValidations: getValidations
    };

    function getValidations() {
        return {
            dataGroupsInteractedWith: dataGroupsInteractedWith(),
            validateDataGroups: validateDataGroups,
            isRequiredDataStreamSelected: isRequiredDataStreamSelected
        };
    }

    function dataGroupsInteractedWith() {
        var regex = /^dataStream.+$/g;
        var dataStreamIds;
        var dataStreamInteractedWith = false;

        return function (form) {
            var groups = dataStreamIds || (dataStreamIds = Object.keys(form).filter(function (key) {
                return regex.test(key);
            }));

            groups.forEach(function (key) {
                if (form[key] && form[key].$dirty) { dataStreamInteractedWith = true; }
            });

            return dataStreamInteractedWith;
        };
    }

    function validateDataGroups(dataGroups) {
        var valid = false;

        valid = Array.prototype.map.call(Object.keys(dataGroups), function (value) {
            return ['noaccess','access','enter'].includes(dataGroups[value]);
        }).reduce(function (valid, curr) {
                return valid || curr;
            }, valid);

        return valid;
    }

    function isRequiredDataStreamSelected(dataGroupNames, user, dataGroups) {
        var selectedDataGroups = userService.getSelectedDataGroups(user, dataGroups);

        if (Array.isArray(dataGroupNames) && dataGroupNames.length > 0) {
            return selectedDataGroups.reduce(function (curr, dataGroup) {
                return dataGroupNames.indexOf(dataGroup.name) >= 0 || curr;
            }, false);
        }
        return true;
    }
}
