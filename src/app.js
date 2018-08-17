window.PEPFARUSERMANAGEMENT = {
    debug: true
};

//==================================================================================
// Config functions
//
function translateConfig($translateProvider) {
    $translateProvider.useLoader('schemaI18nService');
    $translateProvider.preferredLanguage('en');
}

function routerConfig($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/list');

    $stateProvider
        .state('list', {
            url: '/list',
            templateUrl: 'userlist/list.html',
            controller: 'userListController as userList',
            resolve: {
                userFilter: function (userFilterService) {
                    return userFilterService.getUserFilter();
                },
                currentUser: function (schemaService) {
                    return schemaService.store.get('Current User');
                },
                userActions: function (userActionsService) {
                    return userActionsService.getActions();
                },
                dataGroups: function (schemaService) {
                    return schemaService.store.get('Data Groups');
                }
            }
        })
        .state('add', {
            url: '/add',
            templateUrl: 'adduser/add.html',
            controller: 'addUserController as addUser',
            resolve: {
                userTypes: function (schemaService) {
                    return schemaService.store.get('User Types');
                },
                userActions: function (userActionsService) {
                    return userActionsService.getActions();
                },
                dataGroups: function (schemaService) {
                    return schemaService.store.get('Data Groups');
                },
                currentUser: function (schemaService) {
                    return schemaService.store.get('Current User');
                },
                dimensionConstraint: function (schemaService) {
                    return schemaService.store.get('Category Dimension Constraint');
                }
            }
        })
        .state('edit', {
            url: '/edit/{userId}/{username}',
            templateUrl: 'edituser/edit.html',
            controller: 'editUserController as editUser',
            resolve: {
                userTypes: function (schemaService) {
                    return schemaService.store.get('User Types');
                },
                dataGroups: function (schemaService) {
                    return schemaService.store.get('Data Groups');
                },
                userActions: function (userActionsService) {
                    return userActionsService.getActions();
                },
                currentUser: function (schemaService) {
                    return schemaService.store.get('Current User');
                },
                dimensionConstraint: function (schemaService) {
                    return schemaService.store.get('Category Dimension Constraint');
                },
                userToEdit: function ($stateParams, userService) {
                    return userService.getUser($stateParams.userId);
                },
                userLocale: function ($stateParams, userService) {
                    return userService.getUserLocale($stateParams.username);
                },
                userEntity: function ($stateParams, userService) {
                    return userService.getUser($stateParams.userId)
                        .then(function (user) {
                            return userService.getUserEntity(user);
                        });
                }
            },
            params: {
                userId: '',
                username: ''
            }
        })
        .state('globalAdd', {
            url: '/global/add',
            templateUrl: 'globaluserinvite/globaluser-invite.html',
            controller: 'globalUserInviteController as globalUserCtrl',
            resolve: {
                dataGroups: function (schemaService) {
                    return schemaService.store.get('Data Groups');
                },
                userActions: function (userActionsService) {
                    return userActionsService.getActions();
                },
                currentUser: function (schemaService) {
                    return schemaService.store.get('Current User');
                },
                userGroups: function (schemaService) {
                    return schemaService.store.get('Global User Groups');
                }
            }
        })
        .state('globalEdit', {
            url: '/global/edit/{userId}/{username}',
            templateUrl: 'globaluseredit/globaluser-edit.html',
            controller: 'globalUserEditController as globalUserCtrl',
            resolve: {
                dataGroups: function (schemaService) {
                    return schemaService.store.get('Data Groups');
                },
                userActions: function (userActionsService) {
                    return userActionsService.getActions();
                },
                currentUser: function (schemaService) {
                    return schemaService.store.get('Current User');
                },
                userGroups: function (schemaService) {
                    return schemaService.store.get('Global User Groups');
                },
                userToEdit: function ($stateParams, userService, schemaService, notify) {
                    return userService.getUser($stateParams.userId)
                        .then(function (userToEdit) {
                            return schemaService.store.get('User Types').then(function (userTypes) {
                                if (userTypes.fromUser(userToEdit) === 'Global') {
                                    return userToEdit;
                                }

                                notify.warning('Given user id does not seem to correspond with a Global user');
                                throw new Error('Not a global user');
                            });
                        });
                },
                userLocale: function ($stateParams, userService) {
                    return userService.getUserLocale($stateParams.username);
                }
            }
        })
        //.state('manageUserGroups', {
        //    url: '/userGroups/manage',
        //    templateUrl: 'user-groups/manage-user-groups.html',
        //    controller: 'userGroupsController as userGroupsCtrl',
        //    resolve: {
        //        currentUser: function (schemaService) {
        //            return schemaService.store.get('Current User');
        //        },
        //        userGroups: function (schemaService) {
        //            return schemaService.store.get('DATIM User Groups');
        //        }
        //    }
        //})
        .state('noaccess', {
            url: '/noaccess',
            templateUrl: 'noaccess/noaccess.html',
            controller: 'noAccessController as noAccess',
            params: {
                message: 'Your user account does not seem to have the right permissions to access this functionality.'
            }
        });
}

function angularUiSelectConfig(uiSelectConfig) {
    uiSelectConfig.theme = 'bootstrap';
}

//==================================================================================
// Angular app module definition
//
angular.module('PEPFAR.usermanagement', [
    'ui.router',
    'restangular',
    'pascalprecht.translate',
    'ui.select',
    'ui.bootstrap',
    'ui.validate',
    'ngMessages',
    'd2HeaderBar',
    'ngAnimate'
]);

//==================================================================================
// Angular config blocks
//
angular.module('PEPFAR.usermanagement').config(translateConfig);
angular.module('PEPFAR.usermanagement').config(routerConfig);
angular.module('PEPFAR.usermanagement').config(angularUiSelectConfig);
angular.module('PEPFAR.usermanagement').value('SETTINGS', window.PEPFARUSERMANAGEMENT);
angular.module('PEPFAR.usermanagement').config(['$compileProvider', function ($compileProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|file|tel|data):/);
}]);

//==================================================================================
// Angular run blocks
//
angular.module('PEPFAR.usermanagement').run(function (Restangular, webappManifest) {
    var baseUrl = [webappManifest.activities.dhis.href, 'api'].join('/');

    if (process.env.NODE_ENV !== 'production') {
        Restangular.setBaseUrl('http://localhost:8080/dhis/api');
    } else {
        Restangular.setBaseUrl(baseUrl);
    }
});

//==================================================================================
// Bootstrap the app manually
//
function basePathResolver(url, injectables) {
    if (process.env.NODE_ENV !== 'production') {
        return ['http://localhost:8080/dhis', url].join('/');
    }

    return [injectables.webappManifest.activities.dhis.href, url].join('/');
}

window.getBootstrapper('PEPFAR.usermanagement', document)
    .setBasePathResolver(basePathResolver)
    .addInjectableFromRemoteLocation('webappManifest', 'manifest.webapp')
    .execute(function (injectables) {
        window.dhis2 = window.dhis2 || {};
        window.dhis2.settings = window.dhis2.settings || {};

        if (process.env.NODE_ENV !== 'production') {
            window.dhis2.settings.baseUrl = 'http://localhost:8080/dhis';
        } else {
            window.dhis2.settings.baseUrl = injectables.webappManifest.activities.dhis.href.replace(window.location.origin, '').replace(/^\//, '');
        }

        console.log(window.dhis2.settings.baseUrl);
    })
    .loadStylesheet('/dhis-web-commons/css/menu.css')
    .loadScript('/dhis-web-commons/javascripts/dhis2/dhis2.translate.js')
    .loadScript('/dhis-web-commons/javascripts/dhis2/dhis2.menu.js')
    .loadModule('/dhis-web-commons/javascripts/dhis2/dhis2.menu.ui.js', 'd2HeaderBar')
    .bootstrap();
