angular.module('PEPFAR.usermanagement').factory('schemaExtensionsService', schemaExtensionsService);

function schemaExtensionsService(errorHandler) {
    return {
        bind: bind,
        isTruthy: isTruthy
    };

    function isTruthy(expression, argumentNames, argumentValues) {
        return bind({}, 'isTruthy', { fn: expression, args: argumentNames }).isTruthy.apply(null, argumentValues);
    }

    function bind(obj, name, definition, localContext) {
        if (typeof definition !== 'object' || angular.isArray(definition)) { // static value
            obj[name] = definition;
            return obj;
        }

        var assigner = (definition.fn ? 'value' : (definition.get ? 'get' : null));
        if (!assigner) {
            throw 'unable to create function as the definition is missing an "fn" or "get" expression';
        }

        var $context = angular.extend({ errorHandler: errorHandler }, localContext);
        var descriptor = { enumerable: false, configurable: true };
        descriptor[assigner] = compile(definition.fn || definition.get, definition.args, $context, obj);

        Object.defineProperty(obj, name, descriptor);

        return obj;
    }

    function compile(body, args, contextObject, thisArg) {
        var $context = contextObject || {};
        var contextVariableDeclarations = Object.keys($context).reduce(function (javascript, key) {
            return (javascript += 'var ' + key + ' = $context.' + key + ';');
        }, '');

        try {
            var fnBody =
                'var $context = this.$context;' +
                'var thisArg = this.$this;' +
                contextVariableDeclarations +
                'function evaluate() { return ' + body + '; }' +
                'try {' +
                '   return evaluate.call(thisArg);' +
                '} catch (err) {' +
                '   console.log(\'schema-extensions-service.compiled: error in expression: ' + body.replace(/'/g, "\\'") + '\', err);' +
                '   throw err;' +
                '}';

            var fn = null;
            switch ((args || []).length) {
                case 0: fn = new Function(fnBody); break;
                case 1: fn = new Function(args[0], fnBody); break;
                case 2: fn = new Function(args[0], args[1], fnBody); break;
                case 3: fn = new Function(args[0], args[1], args[2], fnBody); break;
                case 4: fn = new Function(args[0], args[1], args[2], args[3], fnBody); break;
                case 5: fn = new Function(args[0], args[1], args[2], args[3], args[4], fnBody); break;
                case 6: fn = new Function(args[0], args[1], args[2], args[3], args[4], args[5], fnBody); break;
                case 7: fn = new Function(args[0], args[1], args[2], args[3], args[4], args[5], args[6], fnBody); break;
                case 8: fn = new Function(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], fnBody); break;
                case 9: fn = new Function(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], fnBody); break;
                default:
                    throw 'unable to create function as the argument list is too long';
            }

            return fn.bind({ $context: $context, $this: thisArg });
        } catch (err) {
            errorHandler.debug('schema-extensions-service: unable to compile expression: ' + body);
            console.error(err);
            throw err;
        }
    }
}
