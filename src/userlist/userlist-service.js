angular.module('PEPFAR.usermanagement').factory('userListService', userListService);

function userListService(Restangular, paginationService, errorHandler) {
    var fields = ['id', 'name', 'email', 'organisationUnits', 'userCredentials[username,disabled,userRoles]', 'userGroups'];
    var filters = [];

    return {
        getList: getList,
        pagination: paginationService,
        setFilter: setFilter,
        getFilters: getFilters,
        resetFilters: resetFilters,
        removeFilter: removeFilter,
        filters: filters
    };

    function getList() {
        return Restangular.one('users')
            .get(getRequestParams())
            .then(setPagination)
            .then(extractUsers)
            .catch(errorHandler.errorFn('Unable to get the list of users from the server'));
    }

    function setPagination(response) {
        if (response.pager) {
            paginationService.setPagination(response.pager);
        }
        return response;
    }

    function extractUsers(response) {
        return response.users || [];
    }

    function getRequestParams() {
        cleanFilters();
        return {
            fields: fields.join(','),
            page: paginationService.getCurrentPage(),
            pageSize: paginationService.getPageSize(),
            filter: filters,
            manage: 'true'
        };
    }

    function getFilters() {
        //window.console.log('ListService: Getting the filters' + filters);
        return filters;
    }

    function setFilter(filter) {
        //window.console.log('ListService: pushing filter: "' + filter + '" length ' + filter.length);
        filters.push(filter);
    }

    function resetFilters() {
        filters = [];
    }

    function removeFilter(index) {
        filters.splice(index, 1);
    }

    function cleanFilters() {
        var arr = [];
        for (var i = 0, len = filters.length; i < len; i = i + 1) {
            if (filters[i].length > 0) {
                arr.push(filters[i]);
            }
        }
        filters = arr;
    }
}
