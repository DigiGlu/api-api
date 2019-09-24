'use strict';
var config = require('./config.json')
const uuidv1 = require('uuid/v1');

// LOGGING with WinstonJS
const winston = require('winston');
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      json: true,
      timestamp: true,
      handleExceptions: true,
      colorize: false,
    })
  ]
});

var SwaggerParser = require('swagger-parser');
var R = require('ramda');

const axios = require('axios');
axios.defaults.headers.common['apikey'] = config.iglu_api_read_key;

const uuidv4 = require('uuid/v4');
var mongoUtils = require('../utilities/mongoUtils')

var util = require('util');

//var mongoUtils = require('../utilities/mongoUtils')

var MongoClient = require('mongodb').MongoClient;

// Mongo URL
const mongourl = process.env.MONGO_STRING;
const dbname = process.env.MONGO_DB_NAME;

module.exports = {
  schemaCreate,
  schemaGet,
  schemaGetByUri,
  schemaFind
};

function schemaCreate(req, res) {
var schema = req.swagger.params.schema.value;

schema.id = uuidv1();
schema.status = "Draft";
schema.owner = req.user.sub;
schema.created = Date.now();
schema.modified = Date.now();
schema.userName = req.user["https://experimenz.com/name"];

let baseUrl = req.url;

if (req.url.indexOf("?")>1) {
  baseUrl = req.url.slice( 0, req.url.indexOf("?") );
}
var self = baseUrl + "/" + schema.id;

var mongoDoc = Object.assign( {}, schema );

// Use connect method to connect to the server
MongoClient.connect(mongourl, function(err, client) {
  if (err!=null) {
    res.status(500).send({ error: err });
    return;
  }
  const db = client.db(dbname);

  // Get the documents collection
  var collection = db.collection('schema');
  // Insert some documents
  collection.insert( mongoDoc, function(err, result) {
    if (err!=null) {
      res.status(500).send({ error: err });
      return;
    }

    client.close();

    });
  });
  res.json( generateHalDoc( schema, self ));
}

function schemaFind(req, res) {
  res.json( [] )
}

function schemaGet(req, res) {
  var id = req.swagger.params.id.value;
  var version  = req.swagger.params.version.value;

  var schemaURI = `https://i-glu.digiglu.io/api/schemas/digiglu/${id}/jsonschema/${version}`;

  axios.get(schemaURI)
  .then( response => {
    delete response.data['$schema'];
    delete response.data['self'];
    res.json( response.data );
  })
  .catch( err => {
    logger.warn("Schema not found", {uri: schemaURI, error: err})
    res.status(404).send();
  })
}

function schemaGetByUri(req, res) {
  var schemaURI = req.swagger.params.uri.value;

  axios.get(schemaURI)
  .then( response => {
    res.json( response.data );
  })
  .catch( err => {
    logger.warn("Schema not found", {uri: schemaURI, error: err})
    res.status(404).send();
  })
}

function generateHalDoc( doc, url ) {
  // delete the mongodb _id attribute from the JSON document
  delete doc["_id"]

  // create _links

  doc._links= {
            self: {
                href: url
                }
            }

  // create _actions

  doc._actions = [];

  return doc;
}
