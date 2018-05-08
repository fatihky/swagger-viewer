## swagger-viewer

A command line tool to view your swagger spec file.

To install, run `npm install -g swagger-viewer`.

To use: `swagger-viewer [--open] [--port <port>] [--host <host>] [--] spec`

This tool accepts both swagger spec files and urls.

Example usage:
```
swagger-viewer swagger.yaml
swagger-viewer http://example.com/swagger.yaml
swagger-viewer --open -- swagger.yaml # open documentation in browser
swagger-viewer --port 8888 swagger.yaml # set listen port
```
