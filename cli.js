#! /usr/bin/env node
const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('request');
const validator = require('validator');
const joi = require('joi');
const opener = require('opener');
const debug = require('debug')('swagger-viewer');

const SWAGGER_DIR = path.join(__dirname, 'node_modules', 'swagger-ui-dist');
const DIST_DIR = SWAGGER_DIR;

const argv = require('minimist')(process.argv.slice(2));

const Application = {
  config: null,
  indexFile: null,
  specFile: null,

  onLoad() {
    if (argv.open) {
      opener(`http://${Application.config.host}:${Application.config.port}`);
    }
  },

  /**
   * Set spec file's contents
   * @param {String} contents
   */
  setSpecFile(contents) {
    try {
      this.specFile = JSON.parse(contents);
    } catch (err) {
      this.specFile = contents;
    }
  }
};

startApp();

function startApp(opts) {
  const app = express();

  validateCommandLineArgs();
  loadIndexFile();

  app.get('/', (req, res, next) => {
    res.send(Application.indexFile);
  });

  app.get('/spec-file', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');

    loadSpecFile(function (err) {
      if (err) {
        console.log(err);
        return res.send(500, 'internal server error');
      }

      if (typeof Application.specFile === 'string') {
        res.set('Content-Type', 'text/yaml');
        res.send(Application.specFile);
        return;
      }

      res.json(Application.specFile);
    });
  });

  app.use(express.static(DIST_DIR));

  app.listen(Application.config.port, Application.config.host, function (err) {
    if (err) {
      throw err;
      return;
    }

    console.log(`server is listening on ${Application.config.port}`);
    Application.onLoad();
  });
}

function commandLineHelp() {
  console.log(`usage:`);
  console.log(`  swagger-viewer [--open --port port --host host] {spec file path or url}`);
  console.log('  --host host: set listen host');
  console.log('  --port port: set listen port');
  console.log('  --open, -o: opens api documentation in default web browser');
}

function validateCommandLineArgs() {
  const schema = joi.object().keys({
    _: joi.array().items(joi.string().required()).length(1),
    port: joi.number().default(8083),
    host: joi.string().default('localhost'),
    open: joi.boolean().default(false),
    o: joi.ref('open')
  });
  const {error, value} = joi.validate(argv, schema, {
    allowUnknown: true
  });

  if (error) {
    debug('validation failed.', error);
    console.log('Error: invalid command line arguments passed\n');
    commandLineHelp();
    process.exit(1);
  }

  value.spec = value._[0];

  Application.config = value;
}

function loadIndexFile() {
  Application.indexFile = fs.readFileSync(path.join(DIST_DIR, 'index.html'))
    .toString()
    .replace(/http:\/\/petstore\.swagger\.io\/v2\/swagger\.json/, `http://${Application.config.host}:${Application.config.port}/spec-file`);
}

function loadSpecFile(cb) {
  const isURL = validator.isURL(Application.config.spec, {
    protocols: [
      'http',
      'https'
    ],
    require_protocol: true
  });

  if (!isURL) {
    fs.readFile(Application.config.spec, function (err, data) {
      if (err) {
        return cb(err);
      }
      Application.setSpecFile(data.toString());
      cb();
    });
    return;
  }

  // load spec file from url
  request(Application.config.spec, function (err, res, body) {
    if (err) {
      return cb(err);
    }

    Application.setSpecFile(body);
    cb();
  });
}
