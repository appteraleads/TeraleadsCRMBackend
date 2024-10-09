const { database, password } = require("pg/lib/defaults");

const Pool = require("pg").Pool;

const pool = new Pool({
    user:"postgres",
    host:"localhost",
    database:"teraleadscrm",
    password:"Teraleads123!",
    port:5432
})

module.exports = pool;