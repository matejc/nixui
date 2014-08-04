var NixInterface = require("../interface");
var expect = require("expect.js");
var sinon = require("sinon");
var describe = require("mocha").describe;
var it = require("mocha").it;
var beforeEach = require("mocha").beforeEach;
var afterEach = require("mocha").afterEach;
var sandbox;

describe('NixInterface', function() {
    describe('#createArgsArray', function() {
        it('empty array', function() {
            expect(NixInterface.createArgsArray()).to.be.empty();
        });
        it('prefix args', function() {
            expect(NixInterface.createArgsArray(['a', 'b'])).to.eql(['a', 'b']);
        });
        it('prefix and file args', function() {
            expect(NixInterface.createArgsArray(['a', 'b'], 'file'))
                .to.eql(['a', 'b', '-f', 'file']);
        });
        it('prefix, file and profile args', function() {
            expect(NixInterface.createArgsArray(['a', 'b'], 'file', 'profile'))
                .to.eql(['a', 'b', '-f', 'file', '-p', 'profile']);
        });
        it('prefix, file, profile, postfix args', function() {
            expect(NixInterface.createArgsArray(['a', 'b'], 'file', 'profile', ['c', 'd']))
                .to.eql(['a', 'b', '-f', 'file', '-p', 'profile', 'c', 'd']);
        });
        it('current profile', function() {
            expect(NixInterface.createArgsArray(null, null, 'current', null))
                .to.eql(['-p', '~/.nix-profile']);
        });
    });
    describe('#nixEnv', function() {
        beforeEach(function() {
            sandbox = sinon.sandbox.create();
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('installPackage', function() {
            var mock = sandbox.mock(NixInterface);
            var finish_callback = function() {};
            var error_callback = function() {};

            // mock nixEnv
            mock.expects('nixEnv').once().returns({
                process: "foo"
            }).withExactArgs(
            ["-iA", "pkgs.bash", "-f", "./file", "-p", "./profile"],
            finish_callback, error_callback);

            // trigger
            NixInterface.installPackage(
                'pkgs.bash', "./file", "./profile",
            finish_callback, error_callback);

            // verify mock expectations
            mock.verify();
        });
        it('uninstallPackage', function() {
            var mock = sandbox.mock(NixInterface);
            var finish_callback = function() {};
            var error_callback = function() {};

            mock.expects('nixEnv').once().returns({
                process: "foo"
            }).withExactArgs(
            ["-e", "bash-0.1.2", "-f", "./file", "-p", "./profile"],
            finish_callback, error_callback);

            NixInterface.uninstallPackage(
                'pkgs.bash', 'bash-0.1.2', "./file", "./profile",
            finish_callback, error_callback);

            mock.verify();
        });
    });
});
