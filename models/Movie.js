const mongoose = require('mongoose');

const movieSchema = mongoose.Schema({
    title: { type: String, required: 'Title is required.' },
    yearReleased: {
        type: String,
        required: 'Year Released is required.',
        validate: {
            validator: v => !isNaN(parseInt(v, 10)),
            message: 'Please enter a valid year in Year Released.'
        }
    }
});

module.exports = mongoose.model('Movie', movieSchema);