
/* requirements */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Pet = require('../models/pet.models');
// Helper to check valid MongoDB ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
// Helper to escape regex special characters
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Helper to parse boolean inputs
const parseBoolean = (val) => val === true || val === 'true';

/* handling data seeds */
// 1. image loader helper
const fs = require('fs');
const path = require('path');
// helper to convert an image file
// from assets to base64 string
const assetsDir = path.resolve(__dirname, '..', 'assets', 'images');
const toRawBase64 = (filename) => {
  const filePath = path.join(assetsDir, filename);
  if (!fs.existsSync(filePath)) return null;

  return fs.readFileSync(filePath).toString('base64');
};

// 2. sample dataset
const samplePets = [
  { name: 'Luna', species: 'cat', isFavorite: true, file: 'icons8-cat-94.png' },
  { name: 'Milo', species: 'dog', isFavorite: true, file: 'icons8-puppy-94.png' },
  { name: 'Thumper', species: 'rabbit', isFavorite: false, file: 'icons8-rabbit-94.png' },
  { name: 'Rio', species: 'bird', isFavorite: true, file: 'icons8-parrot-speaking-94.png' },
  { name: 'Barnaby', species: 'bird', isFavorite: false, file: 'icons8-owl-94.png' },
  { name: 'Echo', species: 'fish', isFavorite: false, file: 'icons8-dolphin-94.png' },
  { name: 'Pippa', species: 'poultry', isFavorite: false, file: 'icons8-chicken-94.png' },
  { name: 'Raja', species: 'wild', isFavorite: false, file: 'icons8-tiger-94.png' }  
];

/** 
* @route DELETE /api/pets
* @desc delete all pres (truncate collection)
*/
router.delete('/', async (req, res, next) => {
  try {
    const result = await Pet.deleteMany({});
    res.status(200).json({
      success: true,
      message: `cleared ${result.deletedCount} pets from database`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    next(error);
  }
});

/** 
 * @route POST /api/pets/seed
 * @desc Seed the database with sample pets
 * @query clean=true (optional) 
*/
router.post('/seed', async (req, res, next) => {
  try {
    const isClean = req.query.clean === 'true' || req.body?.clean === true;
    if (isClean) {
      await Pet.deleteMany({});
    }

    const documents = samplePets.map((item) => ({
      name: item.name,
      species: item.species,
      isFavorite: item.isFavorite,
      image: toRawBase64(item.file)
    }));
    const inserted = await Pet.insertMany(documents);

    res.status(201).json({
      success: true,
      message: isClean
        ? `leaned database and seeded ${inserted.length} `
        : `appended ${inserted.length} sample pets`,
      count: inserted.length,
      data: inserted
    });

  } catch (error) {
    next(error);
  }
});


/**
 * @route   GET /api/pets
 * @desc    Get all pets (with optional filtering)
 * @query   species (optional), isFavorite (optional), search (optional)
 */
router.get('/', async (req, res, next) => {
  try {
    const { species, isFavorite, search } = req.query;
    const filter = {};

    if (species) {
      filter.species = species.trim().toLowerCase();
    }

    if (typeof isFavorite !== 'undefined') {
      filter.isFavorite = parseBoolean(isFavorite);
    }

    if (search && search.trim()) {
      filter.name = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    const pets = await Pet.find(filter).sort({ createdAt: -1 });
    console.log(req.method, req.originalUrl, '->', pets.length, 'pets found');

    res.status(200).json({
      success: true,
      count: pets.length,
      data: pets
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/pets/:id
 * @desc    Get a single pet by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID format'
      });
    }

    const pet = await Pet.findById(id);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    res.status(200).json({
      success: true,
      data: pet
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/pets
 * @desc    Create a new pet
 * @body    { name, species, isFavorite, image }
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, species, isFavorite, image } = req.body;

    if (!name || !name.trim() || !species || !species.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both name and species'
      });
    }

    const newPet = await Pet.create({
      name: name.trim(),
      species: species.trim().toLowerCase(),
      isFavorite: parseBoolean(isFavorite),
      image: image || null
    });

    res.status(201).json({
      success: true,
      message: 'Pet created successfully',
      data: newPet
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/pets/:id
 * @desc    Update an existing pet
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID format'
      });
    }

    const { name, species, isFavorite, image } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = typeof name === 'string' ? name.trim() : name;
    if (species !== undefined) updateData.species = typeof species === 'string' ? species.trim().toLowerCase() : species;
    if (isFavorite !== undefined) updateData.isFavorite = parseBoolean(isFavorite);
    if (image !== undefined) updateData.image = image;

    const updatedPet = await Pet.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedPet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pet updated successfully',
      data: updatedPet
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/pets/:id/favorite
 * @desc    Toggle or set isFavorite status
 */
router.patch('/:id/favorite', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID format'
      });
    }

    const pet = await Pet.findById(id);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    // Toggle if not explicitly specified in body
    if (req.body && req.body.isFavorite !== undefined) {
      pet.isFavorite = parseBoolean(req.body.isFavorite);

    } else {
      pet.isFavorite = !pet.isFavorite;
    }
    await pet.save();

    res.status(200).json({
      success: true,
      message: `Pet favorite status updated to ${pet.isFavorite}`,
      data: pet
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/pets/:id
 * @desc    Delete a pet by ID
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID format'
      });
    }

    const deletedPet = await Pet.findByIdAndDelete(id);
    if (!deletedPet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pet deleted successfully',
      data: { id: deletedPet._id }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
