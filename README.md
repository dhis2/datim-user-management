# PEPFAR User management app
[![Build Status](https://travis-ci.org/dhis2/user-management-pepfar.svg)](https://travis-ci.org/dhis2/user-management-pepfar)
[![Coverage Status](https://img.shields.io/coveralls/dhis2/user-management-pepfar.svg)](https://coveralls.io/r/dhis2/user-management-pepfar)
[![Code Climate](https://codeclimate.com/github/dhis2/user-management-pepfar/badges/gpa.svg)](https://codeclimate.com/github/dhis2/user-management-pepfar)

#### Dependency statuses
[![Dependency Status](https://www.versioneye.com/user/projects/54595f4b2b4804e10b0000c1/badge.svg?style=flat)](https://www.versioneye.com/user/projects/54595f4b2b4804e10b0000c1)
[![Dependency Status](https://www.versioneye.com/user/projects/54595fc12b48049ecc00004e/badge.svg?style=flat)](https://www.versioneye.com/user/projects/54595fc12b48049ecc00004e)

#### The app uses the following depencencies
To get more familiar with the techniques we are using in this project please see the following websites.
+ angular-ui-router (ui.router) https://github.com/angular-ui/ui-router
  - Used instead of ng-route for routing using states
+ restangular (restangular) https://github.com/mgonto/restangular
  - For rest communication with the DHIS2 web api.
+ angular-translate (pascalprecht.translate) https://github.com/angular-translate/angular-translate
  - For i18n support
+ angular-bootstrap (ui.bootstrap) https://github.com/angular-ui/bootstrap
+ angular-ui-select (ui.select) https://github.com/angular-ui/ui-select

## Getting started

### How to get started

##### Clone the repository
```
git clone https://github.com/dhis2/user-management-pepfar.git
```

##### Install the node dependencies
```
npm install
```

##### Install the bower app dependencies
```
bower install
```

##### Run the tests
```
gulp test
```

### Running tests continuously
To run the tests continuously while making changes to the app files or the jasmine spec files use the following gulp task.
```
gulp watch
```

### Building the project
The gulp file contains two different build tasks `gulp build` and `gulp build-prod`.
`gulp build` builds the project into the build directory within the root of the project. `gulp build-prod` does exactly the same but also zips the contents of the build folder into a zip file called `user-maintenance.zip`. This zipfile can be used to install the app into DHIS2.

#### Installing the app into DHIS
How to install the app into dhis can be found at the following url https://www.dhis2.org/doc/snapshot/en/developer/html/ch02s04.html.

### Additional info on the project structure
The project directory stucture is set up as follows. See below the tree for some more detailed information.
```
+ src
  - {component-name}                    // Component based structure for each part of the application a different map
    + {partial}.html
    + {component-name}-controller.js    // Controllers are suffixed with `-controller`  
    + {service-name}-service.js         // Services are suffixed with `-service`  
    + {directive-name}-directive.js     // Directives are suffixed with `-directive`  
  - i18n                                // i18n map that contains the translation files used by angular-translate
    + en.json
  - images                              // Place to store images
    + icons
      + user-maintenance.png
  - index.html                          // Main index file of the app
  - manifest.webapp                     // Webapp manifest, see below for more details
+ test
  - matchers                            // Folder to store jasmine matchers
  - mocks                               // Folder to store test mocks
    + {mock-name}_mock.js               // Mock files are suffixed with `_mock`
  - specs                               
    + {component-name}                  // Specs are groupped by the component they belong to
      + {component-name}-controller_spec.js // The spec files represent the names as used in the component but
      + {service-name}-service_spec.js      // are suffixed with `_spec`
      + {directive-name}-directive_spec.js
  - utils                               // Files that do not fit the specs/mocks or matchers category
+ vendor                                // Place where bower stores its components
+ build                                 // The place where the project gets build when calling `gulp build` or `gulp build-prod`
```
In the main directory you will find a folder `src`. This folder contains all the source files that will be used in the app. This folder will contain all the angular components likes services / directives / controllers etc.

The `test` folder within the main directory contains all the test related files. The specs are located within the `test/specs` directory.

##### Some special things
The `manifest.webapp` might not look familiar. This is a mozilla open web app manifest. This manifest file is used to install the app into DHIS2. See https://developer.mozilla.org/en-US/Apps/Quickstart/Build/Intro_to_open_web_apps  and https://www.dhis2.org/doc/snapshot/en/developer/html/ch02s02.html for more information.

The following directories might show up in the root of the project. The short explanation should give some insight into why this would have happened.
+ temp
  - Directory used by sass and usemin to store the temporary sass output
+ coverage
  - Directory used by coveralls to store the test coverage output from karma
+ .sass-cache
  - Directory used by sass to store cashed sass output


#### dhis.json
To run this project locally a dhis.json file will need to be included. This file will need to live in the root directory as it is part of
the build tasks. It is necessary for copying the directory structure to the application folder.

```javascript

{
    "dhisDeployDirectory": "/usr/local/apache-tomcat-8.0.5/webapps/dhis/apps/user-management/"
}

```
