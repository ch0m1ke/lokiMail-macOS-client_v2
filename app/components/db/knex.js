const { app } = require('electron');
const knex = require('knex');

const dbPath = `${app.getPath("userData")}/db.sqlite3`;

const connectedKnex = knex({
    client: "sqlite3",
    connection: {
        // filename: "db.sqlite3"
        filename: dbPath
        // change to the home/<user>/.loki/db.sqlite3
    },
    useNullAsDefault: true
});

module.exports = connectedKnex;