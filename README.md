# sans-server-swagger

Sans-Server middleware that uses swagger documents to define routes, validate requests, validate responses, and to produce mocks.

## Example

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

### Configuration

The swagger middleware is generated using a configuration with the following properties:

- *controllers* - [REQUIRED] The directory path to JavaScript files that contain the methods to execute to fulfill web service requests.

- *development* - [OPTIONAL] If true then mocks will be used automatically when a controller does not exist and not all controllers must exist, otherwise all controllers must exist. Defaults to `false`.

- *ignoreBasePath* - [OPTIONAL] If true then the swagger base path will not be used in the routes. Defaults to `false`.

- *router*  - [REQUIRED] A [sans-server-router](https://www.npmjs.com/package/sans-server-router) instance that must be configured to use `'handlebar'` path parameters. See the [Example](#example) above.

- *swagger* - [REQUIRED] The swagger file that defines the services. This can be either a json or a yaml file.