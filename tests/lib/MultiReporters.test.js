/*global require, describe, it, before, beforeEach */
var _require = require('root-require');
var expect = require('chai').expect;
var Mocha = require('mocha');
var sinon = require('sinon');
var Suite = Mocha.Suite;
var Runner = Mocha.Runner;
var Test = Mocha.Test;

describe('lib/MultiReporters', function () {
    var MultiReporters;

    before(function () {
        MultiReporters = _require('lib/MultiReporters');
    });

    describe('#static', function () {
        describe('#CONFIG_FILE', function () {
            it('equals to "../config.json"', function () {
                expect(MultiReporters.CONFIG_FILE).to.be.equals('../config.json');
            });
        });
    });

    describe('#instance', function () {
        var suite;
        var runner;
        var reporter;
        var options;

        describe('#internal', function () {
            beforeEach(function () {
                var mocha = new Mocha({
                    reporter: MultiReporters
                });
                suite = new Suite('#internal-multi-reporter', 'root');
                runner = new Runner(suite);
                options = {
                    execute: false,
                    reporterOptions: {
                        configFile: 'tests/custom-internal-config.json'
                    }
                };
                reporter = new mocha._reporter(runner, options);
            });

            describe('#options (reporters - single)', function () {
                it('return reporter options: "dot"', function () {
                    expect(reporter.getReporterOptions(reporter.getOptions(options), 'dot')).to.be.deep.equal({
                        id: 'dot'
                    });
                });

                it('return reporter options: "xunit"', function () {
                    expect(reporter.getReporterOptions(reporter.getOptions(options), 'xunit')).to.be.deep.equal({
                        id: 'xunit',
                        output: 'artifacts/test/custom-xunit.xml'
                    });
                });
            });

            describe('#options (reporters - multiple)', function () {
                it('return default options', function () {
                    expect(reporter.getDefaultOptions()).to.be.deep.equal({
                        reporterEnabled: 'spec, xunit',
                        reporterOptions: {
                            id: 'default'
                        },
                        dotReporterOptions: {
                            id: 'dot'
                        },
                        xunitReporterOptions: {
                            id: 'xunit',
                            output: 'xunit.xml'
                        },
                        tapReporterOptions: {
                            id: 'tap'
                        }
                    });
                });

                it('return custom options', function () {
                    expect(reporter.getCustomOptions(options)).to.be.deep.equal({
                        reporterEnabled: 'dot',
                        xunitReporterOptions: {
                            output: 'artifacts/test/custom-xunit.xml'
                        }
                    });
                });

                it('return resultant options by merging both default and custom options', function () {
                    expect(reporter.getOptions(options)).to.be.deep.equal({
                        reporterEnabled: 'dot',
                        reporterOptions: {
                            id: 'default'
                        },
                        dotReporterOptions: {
                            id: 'dot'
                        },
                        xunitReporterOptions: {
                            id: 'xunit',
                            output: 'artifacts/test/custom-xunit.xml'
                        },
                        tapReporterOptions: {
                            id: 'tap'
                        }
                    });
                });
            });
        });

        describe('#external', function () {
            beforeEach(function () {
                var mocha = new Mocha({
                    reporter: MultiReporters
                });
                suite = new Suite('#external-multi-reporter', 'root');
                runner = new Runner(suite);
                options = {
                    execute: false,
                    reporterOptions: {
                        configFile: 'tests/custom-external-config.json'
                    }
                };
                reporter = new mocha._reporter(runner, options);
            });

            describe('#options (external reporters - single)', function () {
                it('return reporter options: "dot"', function () {
                    expect(reporter.getReporterOptions(reporter.getOptions(options), 'mocha-junit-reporter')).to.be.deep.equal({
                        id: 'mocha-junit-reporter',
                        mochaFile: 'junit.xml'
                    });
                });
            });
        });

        describe('#exception', function () {
            var err;
            beforeEach(function () {
                err = new Error('JSON.parse error!');
                sinon.stub(JSON, 'parse').throws(err);
            });

            afterEach(function () {
                JSON.parse.restore();
            });

            it('throw an exception in default options', function () {
                expect(JSON.parse.callCount).to.equal(0);
                expect(reporter.getDefaultOptions.bind(this)).to.throw(err);
                expect(JSON.parse.threw()).to.equal(true);
                expect(JSON.parse.callCount).to.equal(1);
            });

            it('throw an exception in custom options', function () {
                expect(JSON.parse.callCount).to.equal(0);
                expect(reporter.getCustomOptions.bind(this, options)).to.throw(err);
                expect(JSON.parse.threw()).to.equal(true);
                expect(JSON.parse.callCount).to.equal(1);
            });
        });        
    });

    describe('#test', function () {
        var suite;
        var runner;

        beforeEach(function () {
            var mocha = new Mocha({
                reporter: MultiReporters
            });
            suite = new Suite('#multi-reporter', 'root');
            runner = new Runner(suite);
            new mocha._reporter(runner);
        });

        it('should have 1 test failure', function (done) {
            var tests = [
                {
                    title: '#test-1',
                    state: 'passed'
                },
                {
                    title: '#test-2',
                    state: 'failed'
                }
            ];

            tests.map(function (test) {
                suite.addTest(new Test(test.title, function (done) {
                    if (test.state === 'passed') {
                        done();
                    }
                    else {
                        done(new Error(test.error));
                    }
                }));
            });

            runner.run(function (failureCount) {
                expect(failureCount).to.equals(1);

                // stats
                expect(runner.stats).to.be.include({
                    suites: 1,
                    tests: 2,
                    passes: 1,
                    pending: 0,
                    failures: 1
                });

                // suites
                expect(runner.suite.title).to.equal('#multi-reporter');
                expect(runner.suite.tests).to.be.instanceof(Array);
                expect(runner.suite.tests).to.have.length(2);

                // test
                var test = runner.suite.tests[1];
                expect(test.title).to.equal('#test-2');
                expect(test.state).to.equal('failed');

                done();
            });
        });

        it('should have 1 test pending', function (done) {
            var tests = [
                {
                    title: '#test-1'
                },
                {
                    title: '#test-2'
                }
            ];

            tests.map(function (test) {
                suite.addTest(new Test(test.title));
            });

            runner.run(function (failureCount) {
                expect(failureCount).to.equals(0);

                // stats
                expect(runner.stats).to.be.include({
                    suites: 1,
                    tests: 2,
                    passes: 0,
                    pending: 2,
                    failures: 0
                });

                // suites
                expect(runner.suite.title).to.be.equal('#multi-reporter');
                expect(runner.suite.tests).to.be.instanceof(Array);
                expect(runner.suite.tests).to.have.length(2);

                // test
                var test = runner.suite.tests[0];
                expect(test.title).to.be.equal('#test-1');
                expect(test.pending).to.equal(true);

                done();
            });
        });
    });
});
