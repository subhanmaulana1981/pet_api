/* requirements */
const mongoose = require('mongoose');

/* Supported species enum based on categories */
const ALLOWED_SPECIES = [
  'cat',
  'dog',
  'rabbit',
  'bird',
  'fish',
  'poultry',
  'wild'
];

/* Pet Schema */
const petSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    species: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      enum: {
        values: ALLOWED_SPECIES,
        message: '{VALUE} is not a valid species. Allowed: ' + ALLOWED_SPECIES.join(', ')
      }
    },

    isFavorite: {
      type: Boolean,
      default: false
    },

    // Raw Base64 encoded image string or URL
    image: {
      type: String,
      default: null
    }
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('Pet', petSchema);
module.exports.ALLOWED_SPECIES = ALLOWED_SPECIES;

