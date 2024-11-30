const { DataTypes } = require('sequelize');
const sequelize = require('../Config/database'); // Make sure to adjust the path to your Sequelize database configuration

const Permission = sequelize.define('Permission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    type: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    created_on: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    created_by: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
}, {
    tableName: 'permissions',
    timestamps: false, // Disable automatic `createdAt` and `updatedAt` timestamps
});

module.exports = Permission;
