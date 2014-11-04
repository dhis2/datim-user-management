function appController() {
    this.title = 'User management';
}

function translateConfig($translateProvider) {
    $translateProvider.useStaticFilesLoader({
        prefix: 'i18n/',
        suffix: '.json'
    });
    $translateProvider.preferredLanguage('en');
}

function routerConfig($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/list');

    $stateProvider
        .state('list', {
            url: '/list',
            templateUrl: 'partials/list.html',
            controller: 'userListController as userList'
        })
        .state('add', {
            url: '/add',
            templateUrl: 'partials/add.html',
            controller: 'addUserController as addUser'
        });
}

angular.module('PEPFAR.usermanagement', [
    'ng',
    'ui.router',
    'restangular',
    'pascalprecht.translate',
    'ui.select',
    'ui.bootstrap'
]);

angular.module('PEPFAR.usermanagement').controller('appController', appController);
angular.module('PEPFAR.usermanagement').config(translateConfig);
angular.module('PEPFAR.usermanagement').config(routerConfig);
