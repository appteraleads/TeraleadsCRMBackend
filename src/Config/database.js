const { Sequelize } = require('sequelize');

// Create a new Sequelize instance with connection pooling
const sequelize = new Sequelize('teracrm', 'postgres', 'Teraleads123!', {
    host: '161.35.55.97', // Replace with your database host
    dialect: 'postgres', // Your database dialect (postgres, mysql, etc.)
    port: 5415, // Add your database port here
    pool: {
        max: 10, // Maximum number of connections in pool
        min: 0,   // Minimum number of connections in pool
        acquire: 60000,// Maximum time, in milliseconds, that pool will try to get connection before throwing error
        idle: 10000 // Maximum time, in milliseconds, that a connection can be idle before being released
    },
    logging: false, // Set to console.log to see SQL queries being executed
});

// Test the connection
sequelize.authenticate()
    .then(async() => {
        const currentDatabaseTime = await sequelize.query("SELECT NOW() AS current_time", {
            type: Sequelize.QueryTypes.SELECT,
          });
          
        console.log("Current database time:", currentDatabaseTime[0].current_time);
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

module.exports = sequelize;
