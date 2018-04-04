/* globals hasAll */
angular.module('PEPFAR.usermanagement').factory('dataGroupsService', dataGroupsService);

function dataGroupsService($q, Restangular, schemaService, _, errorHandler) {
    return {
        getUserGroups: getUserGroups
    };

    function getUserGroups(userToEdit, dataGroups, userStreams) {
        var allDataGroups = schemaService.store.get('Data Groups', true);

        var userGroupIds = _.values(_.pluck(_.flatten(_.pluck(allDataGroups, 'userGroups')), 'id'));
        var baseGroups = _.filter(userToEdit.userGroups, function (userGroup) {
            return userGroupIds.indexOf(userGroup.id) === -1;
        });

        dataGroups = dataGroups.map(function (dataGroup) {
            if (userStreams && userStreams[dataGroup.name] && userStreams[dataGroup.name].access) {
                dataGroup.access = true;
            }
            return dataGroup;
        });

        dataGroups = _.filter(dataGroups, function (dataGroup) {
            return (userStreams && dataGroup && userStreams[dataGroup.name] && userStreams[dataGroup.name].access === true);
        });

        var dataUserGroups = _.flatten(_.pluck(_.filter(dataGroups, function (dataGroup) {
            return dataGroup.access === true;
        }), 'userGroups'));

        return [].concat(baseGroups).concat(dataUserGroups);
    }
}
