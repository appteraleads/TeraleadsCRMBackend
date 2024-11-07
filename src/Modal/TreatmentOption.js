const { Model, DataTypes } = require('sequelize');
const sequelize = require('../Config/database'); 

class TreatmentOption extends Model {}

TreatmentOption.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    price: {
        type: DataTypes.FLOAT, // Change to FLOAT for numerical representation
    },
    treatment_option: {
        type: DataTypes.STRING(255),
    },
    url: {
        type: DataTypes.STRING(255), // Removed the UNIQUE constraint
    },
    created_on: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    modelName: 'TreatmentOption',
    tableName: 'treatment_options',
    timestamps: false, // If you're manually managing created_on, keep this false
});

module.exports = TreatmentOption;
