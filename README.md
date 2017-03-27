# sans-server-swagger

Sans-Server middleware that uses swagger documents to define routes, validate requests, validate responses, and to produce mocks.

## Example

The following example will produce mock responses using response examples for any incoming requests. You can add actual implementations through [controllers](#swagger-document-controllers).

A complete example can be found in the [example directory](https://github.com/byu-oit-appdev/sans-server-swagger/tree/master/example).

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
    router: Router({ paramFormat: 'handlebar' }),
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

- *ignoreBasePath* - [OPTIONAL] If true then the swagger base path will not be used in the routes. Defaults to `false`.

- *mockQueryParameter* - [OPTIONAL] The query parameter to look for when a response should be manually mocked. Defaults to `mock`.

- *router*  - [REQUIRED] A [sans-server-router](https://www.npmjs.com/package/sans-server-router) instance that must be configured to use `'handlebar'` path parameters. See the [Example](#example) above.

- *swagger* - [REQUIRED] The swagger file that defines the services. This can be either a json or a yaml file.

## Controllers

Out of the box and using the example above this middleware will produce mock responses. To write implementations for your swagger endpoints you needs to set up controllers.

You can look at the [example directory](https://github.com/byu-oit-appdev/sans-server-swagger/tree/master/example) contained within this project for details.

In summary:

1. You need a directory where you will place all of your controller files. This directory is specified by the `controller` option when creating the middleware.

    ```js
    const swaggerMiddleware = Swagger({
        controllers: './controllers',
        ...
    });
    ```

2. Each path's controller implementation is defined by it's `x-controller` and `operationId`.

    - `x-controller` is the name of the file within the controllers directory that implements the function defined by the `operationId`. The `x-controller` can be defined for the entire swagger document, for a specific path, or for a specific method within a path by defining this property at those different levels within your swagger document.

    - `operationId` is the name of the property within your controller that has the function to execute. This function will receive as parameters the sans-server request and response objects.
    
    **For example purposes only**, in the following example the `x-controller` is defined at the document level, the path level, and the method level. In actuality, the `x-controller` only needs to be defined at each appropriate level once. If defined at the document level then all paths and methods will use that controller unless a specific path or method has an `x-controller` specified as something else.

    ```yaml
    x-controller: pets              # All paths will use pets.js controller
    paths:
      "/pets":
        x-controller: pets          # This path will use the pets.js controller
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