angular.module('PEPFAR.usermanagement').controller('appController', appController);

function appController($scope, Restangular, webappManifest, errorHandler, schemaService) {
    var vm = this;

    vm.title = 'User management';
    vm.subTitle = '';
    vm.isLoading = false;
    vm.headerBar = {
        title: '',
        logo: '',
        link: ''
    };

    vm.isGlobalUser = false;
    vm.hasAllAuthority = false;

    vm.subTitles = {
        add: 'Invite user',
        list: 'Manage users',
        edit: 'Edit user',
        noaccess: 'No access',
        globalAdd: 'Invite Global user',
        globalEdit: 'Edit Global user',
        manageUserGroups: 'Manage user groups'
    };

    initialise();

    $scope.$on('$stateChangeStart', function () {
        vm.isLoading = true;
    });
    $scope.$on('$stateChangeSuccess', function (event, toState) {
        vm.isLoading = false;
        vm.currentState = toState.name;
        vm.subTitle = vm.subTitles[toState.name] || '';
    });
    $scope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
        errorHandler.debug('Failed to switch to ', toState, error);
        vm.isLoading = false;
    });

    function initialise() {
        Restangular.one('systemSettings')
            .get()
            .then(function (systemSettings) {
                var baseUrl = webappManifest.activities.dhis.href;

                if (systemSettings.keyCustomTopMenuLogo === true) {
                    vm.headerBar.logo = [
                        baseUrl,
                        '/external-static/logo_banner.png'
                    ].join('');
                }
                vm.headerBar.title = systemSettings.applicationTitle || '';
                vm.headerBar.link = [baseUrl, systemSettings.startModule, 'index.action'].join('/');
            });

        schemaService.store.get('Current User')
            .then(function (currentUser) {
                console.log(currentUser);
                if (currentUser.isGlobalUser() && currentUser.isUserAdministrator()) {
                    vm.isGlobalUser = true;
                }
                vm.hasAllAuthority = currentUser.hasAllAuthority();
            });
    }
}
