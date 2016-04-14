if (process.env.NODE_ENV !== 'production') {
    jQuery.ajaxSetup({ // eslint-disable-line no-undef
        headers: {
            Authorization: `Basic ${btoa('admin:district')}`,
        },
    });

    jQuery('head').append(`
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css">
    `);
}

require("../vendor/jquery/dist/jquery.js");
window.toastr = require("../vendor/toastr/toastr.js");
require("../vendor/lodash/dist/lodash.js");
require("../vendor/angular/angular.js");
require("../vendor/angular-animate/angular-animate.js");
require("../vendor/angular-messages/angular-messages.js");
require("../vendor/ui-router/release/angular-ui-router.js");
require("../vendor/angular-bootstrap/ui-bootstrap-tpls.js");
require("../vendor/angular-ui-select/dist/select.js");
require("../vendor/angular-ui-utils/validate.js");
require("../vendor/angular-translate/angular-translate.js");
require("../vendor/angular-translate-loader-static-files/angular-translate-loader-static-files.js");
require("../vendor/restangular/dist/restangular.js");

require("./utils.js");
require("./ngBootstrapper.js");
require("./app.js");
require("./lodash/lodash-factory.js");
require("./app/app-controller.js");
require("./users/usertypes-service.js");
require("./users/usertype-select-directive.js");
require("./users/useractions-service.js");
require("./users/userstatus-service.js");
require("./datagroups/datagroups-service.js");
require("./adduser/adduser-controller.js");
require("./userlist/userlist-controller.js");
require("./userlist/userfilter-service.js");
require("./userlist/pagination-service.js");
require("./userlist/userlist-service.js");
require("./user-roles/user-roles-service.js");
require("./pepfar/agency-select-directive.js");
require("./pepfar/agencies-service.js");
require("./pepfar/partner-select-directive.js");
require("./pepfar/partners-service.js");
require("./language/locale-service.js");
require("./language/locale-select-directive.js");
require("./adduser/usertype-controller.js");
require("./edituser/edituser-controller.js");
require("./users/user-service.js");
require("./errorhandler/errorhandler-service.js");
require("./users/currentuser-service.js");
require("./noaccess/noaccess-controller.js");
require("./categories/categories-service.js");
require("./notify/notify-service.js");
require("./users/interagency-service.js");
require("./userform/userform-service.js");
require("./userstatus/userstatus-directive.js");
require("./organisationunits/organisationunit-service.js");
require("./organisationunits/organisationunit-select-directive.js");
require("./users/userutils-service.js");
require("./dataentry/dataentry-directive.js");
require("./dataentry/dataentry-service.js");
require("./globaluserinvite/globaluserinvite-controller.js");
require("./globaluserinvite/globaluser-service.js");
require("./globaluseredit/globaluseredit-controller.js");
