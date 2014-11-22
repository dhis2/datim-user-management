describe('Agencies service', function () {
    var errorHandler;
    var agenciesService;

    beforeEach(module('PEPFAR.usermanagement'));
    beforeEach(inject(function ($injector) {
        errorHandler = $injector.get('errorHandler');
        spyOn(errorHandler, 'error').and.callThrough();
        agenciesService = $injector.get('agenciesService');
    }));

    it('should be an object', function () {
        expect(agenciesService).toBeAnObject();
    });

    it('should be a function', function () {
        expect(agenciesService.getAgencies).toBeAFunction();
    });

    describe('getAgencies', function () {
        var $httpBackend;
        var fixtures = window.fixtures;
        var agenciesRequest;

        function withFakeUserGroups(expectedAgencies) {
            return {
                items: expectedAgencies.items.map(function (agency) {
                    agency.userGroup = {};
                    return agency;
                })
            };
        }

        beforeEach(inject(function ($injector) {
            $httpBackend = $injector.get('$httpBackend');

            $httpBackend.whenGET('http://localhost:8080/dhis/api/me')
                .respond(200, {
                    organisationUnits: [
                        {
                            name: 'Rwanda'
                        }
                    ]
                });
            $httpBackend.whenGET('http://localhost:8080/dhis/api/me')
                .respond(200, {});
            $httpBackend.whenGET('http://localhost:8080/dhis/api/me/authorization')
                .respond(200, []);

            agenciesRequest = $httpBackend.expectGET('http://localhost:8080/dhis/api/dimensions/bw8KHXzxd9i/items?paging=false')
                .respond(200, fixtures.get('agenciesList'));
            $httpBackend.whenGET('http://localhost:8080/dhis/api/userGroups?fields=id,name&filter=name:like:Rwanda&filter=name:like:mechanisms&paging=false')
                .respond(200, {
                    userGroups: [
                    ]
                });
        }));

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        it('should return a promise like function', function () {
            expect(agenciesService.getAgencies()).toBeAPromiseLikeObject();
            $httpBackend.flush();
        });

        it('promise should return an array with agencies', function () {
            var agencies;
            var expectedAgencies = withFakeUserGroups(fixtures.get('agenciesList')).items;
            agenciesRequest.respond(200, withFakeUserGroups(fixtures.get('agenciesList')));

            agenciesService.getAgencies().then(function (data) {
                agencies = data;
            });
            $httpBackend.flush();

            expect(agencies).toEqual(expectedAgencies);
        });

        it('should request the userGroups for agencies', function () {
            $httpBackend.expectGET('http://localhost:8080/dhis/api/userGroups?fields=id,name&filter=name:like:Rwanda&filter=name:like:mechanisms&paging=false')
                .respond(200, fixtures.get('rwandaUserGroup'));

            agenciesService.getAgencies();
            $httpBackend.flush();
        });

        it('should add the usergroups to the agency objects', function () {
            var agencies;
            var expectedAgency = {
                name: 'HHS/CDC',
                created: '2014-05-09T23:23:06.953+0000',
                lastUpdated: '2014-10-05T13:07:55.940+0000',
                id: 'FPUgmtt8HRi',
                userGroup: fixtures.get('rwandaUserGroup').userGroups[1]
            };

            $httpBackend.expectGET('http://localhost:8080/dhis/api/userGroups?fields=id,name&filter=name:like:Rwanda&filter=name:like:mechanisms&paging=false')
                .respond(200, fixtures.get('rwandaUserGroup'));

            agenciesService.getAgencies().then(function (data) {
                agencies = data;
            });
            $httpBackend.flush();

            expect(agencies[0]).toEqual(expectedAgency);
        });

        it('should not return any agencies without groups', function () {
            var agencies;

            $httpBackend.expectGET('http://localhost:8080/dhis/api/userGroups?fields=id,name&filter=name:like:Rwanda&filter=name:like:mechanisms&paging=false')
                .respond(200, fixtures.get('rwandaUserGroup'));

            agenciesService.getAgencies().then(function (data) {
                agencies = data;
            });
            $httpBackend.flush();

            expect(agencies.length).toBe(2);
            expect(agencies[0].userGroup.id).toBe('Stc8jiohyTg');
            expect(agencies[1].userGroup.id).toBe('FzwHJqJ81DO');
        });

        it('should reject the promise with an error', function () {
            var catchFunction = jasmine.createSpy();
            agenciesRequest.respond(200, fixtures.get('agenciesList'));

            agenciesService.getAgencies().catch(catchFunction);
            $httpBackend.flush();

            expect(catchFunction).toHaveBeenCalled();
            expect(errorHandler.error).toHaveBeenCalled();
        });
    });
});
