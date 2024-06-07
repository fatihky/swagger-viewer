#! /usr/bin/env node
import { Command } from "@commander-js/extra-typings";
import * as express from "express";
import { readFileSync } from "fs";
import opener from "opener";
import { dirname, join } from "path";
import { getAbsoluteFSPath } from "swagger-ui-dist";
import validator from "validator";

const DIST_DIR = getAbsoluteFSPath();

const program = new Command()
  .name("swagger-viewer")
  .option("--host <hostname>", "Listen address", "localhost")
  .option("--port <port>", "Port to listen on", (val) => Number(val), 8083)
  .option("--open --no-open", "Launch the default browser.", true)
  .argument("<spec file path or url>")
  .parse();

const opts = program.opts();

const Application = {
  indexFile: null,
  specFile: "",
  rootDir: null,
  isURL: false,

  onLoad() {
    if (opts.open) {
      opener(`http://${opts.host}:${opts.port}`);
    }
  },

  /**
   * Set spec file's contents
   * @param {String} contents
   */
  setSpecFile(contents: string) {
    try {
      this.specFile = JSON.parse(contents);
    } catch (err) {
      this.specFile = contents;
    }
  },
};

startApp();

function startApp() {
  const app = express();

  validateCommandLineArgs();
  loadIndexFile();

  app.get("/", (req, res, next) => {
    res.send(Application.indexFile);
  });

  app.get("/spec-file", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");

    loadSpecFile()
      .then(() => {
        if (typeof Application.specFile === "string") {
          res.set("Content-Type", "text/yaml");
          res.send(Application.specFile);
          return;
        }

        res.json(Application.specFile);
      })
      .catch((err) => {
        console.error("Cannot load spec file:", err);

        res.status(500).send("internal server error");
      });
  });

  app.get(
    "/*",
    express.static(DIST_DIR),
    express.static(Application.rootDir || DIST_DIR, { extensions: [".yaml"] })
  );

  app.listen(opts.port, opts.host, function () {
    console.log(`server is listening on ${opts.port}`);
    Application.onLoad();
  });
}

function validateCommandLineArgs() {
  const [specFile] = program.args;

  Application.isURL = validator.isURL(specFile, {
    protocols: ["http", "https"],
    require_protocol: true,
  });

  if (!Application.isURL)
    Application.rootDir = dirname(join(process.cwd(), specFile));
}

function loadIndexFile() {
  Application.indexFile = readFileSync(join(DIST_DIR, "index.html"))
    .toString()
    .replace(
      /"https?:\/\/petstore\.swagger\.io\/v2\/swagger\.json"/,
      `location.protocol + "//${opts.host}:${opts.port}/spec-file"`
    );
}

async function loadSpecFile() {
  const [specFile] = program.args;

  if (Application.isURL) {
    const resp = await fetch(specFile);

    Application.setSpecFile(await resp.text());
  } else {
    const data = readFileSync(specFile);

    Application.setSpecFile(data.toString());
  }
}
