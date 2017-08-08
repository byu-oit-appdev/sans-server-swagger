# sans-server-swagger

Sans-Server middleware that uses swagger documents to define routes, validate requests, validate responses, and to produce mocks.

## Table of Contents

- [Example](#example)
- [Configuration](#configuration)
- [Helper Methods](#helper-methods)
    - [req.deserialize.binary](#reqdeserializebinary)
    - [req.deserialize.byte](#reqdeserializebyte)
    - [req.deserialize.date](#reqdeserializedate)
    - [req.deserialize.dateTime](#reqdeserializedatetime)
    - [res.enforce](#resenforce)
    - [res.swagger.example](#resswaggerexample)
    - [res.swagger.enforce](#resswaggerenforce)
- [Controllers](#controllers)
- [Mocks](#mocks)
    - [Validation](#validation)
    - [Mock Sources](#mock-sources)
    - [Automatic vs Manual Mocking](#automatic-vs-manual-mocking)
    - [Test Response Examples](#test-response-examples)
- [Swagger Enforcer](#swagger-enforcer)
    - [Response Enforcement](#response-enforcement)

## Example

The following example will produce mock responses using response examples for any incoming requests. You can add actual implementations through [controllers](#swagger-document-controllers).

A complete example can be found in the [example directory](https://github.com/byu-oit/sans-server-swagger/tree/master/example).

```js
const Server = require('sans-server');
const Swagger = require('sans-server-swagger');
const Router = require('sans-server-router');

// define the server
const server = Server();

// define the swagger middleware with a router
const swaggerMiddleware = Swagger({
    controllers: './controllers',
    development: true,
    exception: function(res, state) {
        res.body({
            status: state.statusCode,
            message: state.body
        });
    },
    swagger: './swagger.json'
});

// use the swagger middleware
server.use(swaggerMiddleware);

// make a request against the server
server.request({ method: 'GET', path: '/v1/path/to/call' })
    .then(function(res) {
        console.log(res.statusCode);
        console.log(res.body);
    });
```

## Configuration

The swagger middleware is generated using a configuration with the following properties:

- *controllers* - [REQUIRED] The directory path to JavaScript files that contain the methods to execute to fulfill web service requests.

- *development* - [OPTIONAL] If true then mocks will automatically be produced from examples when a controller does not exist. Additionally not all controllers must exist. If set to false then all controller implementations must exist. Defaults to `false`.

- *exception* - [OPTIONAL] A function that will get called if the middleware is unable to provide an expected response. This function will receive two parameters: 1) res - the response object, and 2) state - the current response state data. Use the response object to make any modifications to the response before it is returned.

    This function will be called when 1) the response does not meet the response schema defined by swagger, 2) the response uses a status code that is not defined by swagger, 3) the request has invalid input, and 4) when a response is not implemented.

- *ignoreBasePath* - [OPTIONAL] If true then the swagger base path will not be used in the routes. Defaults to `false`.

- *mockQueryParameter* - [OPTIONAL] The query parameter to look for when a response should be manually mocked. Defaults to `mock`.

- *swagger* - [REQUIRED] The swagger file that defines the services. This can be either a json or a yaml file.

## Helper Methods

### req.deserialize.binary

Convert an 8-bit binary string, made of `0`s and `1`s, into a Buffer object.

**Signature:** req.deserialize.binary ( value: String ) : Buffer

**Parameters:**

- *value* - An 8-bit binary string made of `0`s and `1`s.

**Returns** a Buffer.

```js
const buffer = req.deserialize.binary('00000010');
```

### req.deserialize.byte

Convert a base64 encoded string into a Buffer object.

**Signature:** req.deserialize.byte ( value: String ) : Buffer

**Parameters:**

- *value* - A base64 encoded string.

**Returns** a Buffer.

```js
const buffer = req.deserialize.binary('aGVsbG8=');
```

### req.deserialize.date

Convert a date string (formatted as YYYY-MM-DD) into a Date object.

**Signature:** req.deserialize.date ( value: String ) : Date

**Parameters:**

- *value* - A date string, formatted as YYYY-MM-DD.

**Returns** a Date.

```js
const date = req.deserialize.date('2000-01-01');
```

### req.deserialize.dateTime

Convert an ISO date string into a Date object.

**Signature:** req.deserialize.dateTime ( value: String ) : Date

**Parameters:**

- *value* - An ISO date string.

**Returns** a Date.

```js
const date = req.deserialize.dateTime('2000-01-01T00:00:00.000Z');
```

### res.enforce

*Deprecated*

[See res.swagger.enforce](#resswaggerenforce)

### res.swagger.example

A shortcut method to get a response example.

**Signature:** res.swagger.example ( [ code: String | Number [, type: String ] ] ) : *

**Parameters:**

- *code* - An optional parameter for the response code. If omitted then the first response code will be used.

- *type* - An optional parameter specifying the content-type to use for the example. If omitted then the value will be derived from the request's `Accept` header.

**Returns** the data type that is being enforced.

```js
const result = req.enforce(200);
```

### res.swagger.enforce

Begin building an object with line by line enforcement. As you mutate the object each change will be validated against the expected swagger response. Also implements defaults automatically as possible. If the response is not an object then continual enforcement will not be in effect, although it will validate the initial value.

[Read more about enforcement](#swagger-enforcer)

**Signature:** res.swagger.enforce ( code: String | Number [, initialValue: * ] ) : *

**Parameters:**

- *code* - The response code the enforce the response for.

- *initialValue* - An optional value to initialize with.

**Returns** the data type that is being enforced.

```js
const result = res.swagger.enforce(200);
```

## Controllers

Out of the box and using the example above this middleware will produce mock responses. To write implementations for your swagger endpoints you needs to set up controllers.

You can look at the [example directory](https://github.com/byu-oit/sans-server-swagger/tree/master/example) contained within this project for details.

In summary:

1. You need a directory where you will place all of your controller files. This directory is specified by the `controller` option when creating the middleware.

    ```js
    const swaggerMiddleware = Swagger({
        controllers: './controllers',
        ...
    });
    ```

2. Each path's controller implementation is defined by it's `x-controller` and `operationId`.

    - `x-controller` is the name of the file within the controllers directory that implements the function defined by the `operationId`. The `x-controller` can be defined for the entire swagger document, for a specific path, or for a specific method within a path by defining this property at those different levels within your swagger document. An `x-controller` defined at one level can be overwritten by another `x-controller` at a more specific level.

    - `operationId` is the name of the property within your controller that has the function to execute. This function will receive as parameters the sans-server request and response objects.
    
    **For example purposes only**, in the following example the `x-controller` is defined at the document level, the path level, and the method level. In actuality, the `x-controller` only needs to be defined at each appropriate level once. If defined at the document level then all paths and methods will use that controller unless a specific path or method has an `x-controller` specified as something else.

    ```yaml
    x-controller: pets              # All methods for all paths will use pets.js controller unless overwritten
    paths:
      "/pets":
        x-controller: pets          # This path will use the pets.js controller for all methods within this path unless overwritten
        get:
          x-controller: pets        # This method within this path will use the pets.js controller
          summary: List all pets
          operationId: listPets     # Implementation looked for in exports.listPets in pets.js file
    ```

## Mocks

### Validation

Mocked responses will be validated against the swagger response definition.

### Mock Sources

In order for mocks to work there must be a source. Mocks can be produced from two sources:

1. From examples within the swagger document:

    ```yaml
    paths:
      "/pets":
        get:
          summary: List all pets
          operationId: listPets
          responses:
            '200':
              description: An paged array of pets
              examples:
                application/json:     # Mocks will be produced from examples
                - id: 123
                  name: Sparky
                  tag: Dog
                - id: 456
                  name: Ghost
                  tag: Cat
                - id: 789
                  name: Goldy
                  tag: Fish
              schema:
                "$ref": "#/definitions/Pets"
    ```
    
2. From an implemented mock in a controller:

    ```js
    // until this implementation is complete we can have it call the custom mock
    exports.listPets = function(req, res) {
        exports.listPets.mock(req, res);     // call the mock
    };
    
    // a custom mock for this implementation
    exports.listPets.mock = function(req, res) {
        res.send([
            {
                id: 123,
                name: "Sparky",
                tag: "Dog"
            },
            {
                id: 456,
                name: "Ghost",
                tag: "Cat"
            },
            {
                id: 789,
                name: "Goldy",
                tag: "Fish"
            }
        ]);
    };
    ```

### Automatic vs Manual Mocking

**Automatic Mocking**

Automatic mocking only works if these conditions are met:

1. The [configuration](#configuration) must have the `development` option set to `true`.

2. There must be no implementation for the endpoint being hit.

3. There must be a [mock source](#mock-sources).

For mocks that are [sourced](#mock-sources) from the swagger document examples the swagger response that is defined first will be used to determine the mock being sent back. Additionally the request's `Accept` header will be used to determine which example to send back. If the request's `Accept` header is not set then the first example's content type will be used.

**Manual Mocking**

Mocks can be used manually even when an implementation exists or when not in development mode.

Manual mocking only works if these conditions are met:

1. The swagger definition for the path being mocked must specify the [mocked query parameter](#configuration) as a swagger query parameter.

2. The incoming request has a query parameter that matches the [mocked query parameter](#configuration).

3. There must be a [mock source](#mock-sources).

For mocks that are [sourced](#mock-sources) from the swagger document examples the [mocked query parameter](#configuration) value is used in conjunction with the request's `Accept` header to determine which response example to send back. If the request's `Accept` header is not set then the first example's content type will be used.

### Testing Response Examples

There is no need to write test cases for all of your swagger response examples. A tool has been provided that will do this for you.

**Validate Response Examples using Terminal/Command Line**

For this to work you'll need to install the sans-server-swagger module globally `npm install -g sans-server-swagger`. Then run the following command with the parameter being the path to your swagger file:

```text
sans-server-swagger ./swagger.yaml
```

**Validate With Mocha**

```js
const expect = require('chai').expect;
const Swagger = require('sans-server-swagger');

describe('my tests', () => {
    it('examples are valid', () => {
        return Swagger.testSwaggerResponseExamples('./swagger.yaml')
            .then(results => expect(results.percentage).to.equal(1));
    });
});
```

**Validate With Tape**

```js
const Swagger = require('sans-server-swagger');
const test = require('tape');

test('my tests', t => {
    t.plan(1);
    Swagger.testSwaggerResponseExamples('./swagger.yaml')
        .then(results => t.equal(results.percentage, 1));
});
```

## Swagger Enforcer

This package uses the [swagger-enforcer](https://www.npmjs.com/package/swagger-enforcer) package to perform validation. The swagger-enforcer has been exposed through this package. This is especially useful for its [type conversion](https://www.npmjs.com/package/swagger-enforcer#enforcerto) and [parameter injection](https://www.npmjs.com/package/swagger-enforcer#enforcerinjectparameters) tools.

```js
const Swagger = require('sans-server-swagger');
const Enforcer = Swagger.Enforcer;

const date = Enforcer.to.date(new Date());
console.log(date);      // a string of "2000-01-01" (or whatever the date actually is)
```

### Response Enforcement

You can enforce a response while it is being built by using the swagger-enforcer. As of now the enforced rules are the [defaults](https://www.npmjs.com/package/swagger-enforcer#enforcement-options).
 
To enforce a response while building you only need to specify which response you'll be building. Below you can see an implemented controller method that uses the building enforcement:

```js
exports.foo = function(req, res) {
    const result = res.enforce(200);    // 200 - the response code to enforce
    result.firstName = 'Bob';           // an error will be thrown here if this is an invalid mutation of the result
    result.lastName = 'Smith';          // an error will be thrown here if this is an invalid mutation of the result
    res.send(result);
};
```

Additionally you can optionally set the initial value:

```js
exports.foo = function(req, res) {
    const result = res.enforce(200, { firstName: 'Bob' });  // will throw an error here if initial value is invalid
    result.lastName = 'Smith';          // an error will be thrown here if this is an invalid mutation of the result
    res.send(result);
};
```