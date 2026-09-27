import crypto from 'crypto';
import express from 'express';
import mongoose from 'mongoose';

import { optionalAuth } from '../middleware/auth.js';
import { normalizeAndValidate } from '../services/inputService.js';
import { deriveGeometry } from '../services/geometryService.js';
import { getWeather } from '../services/weatherService.js';
import { evaluateDesign } from '../services/designEngine.js';
import Simulation from '../models/simulation.js';

const router = express.Router();

router.post('/simulate', optionalAuth, async (req, res) => {
  try {
    const { normalized: inputs, errors, schemaVersion } =
      normalizeAndValidate(req.body);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ShelterX input.',
        errors
      });
    }

    const requestId = crypto.randomUUID();
    const geometry = deriveGeometry(inputs.dimensions);
    const weather = await getWeather(inputs.lat, inputs.lon);
    const result = await evaluateDesign({ inputs, weather, geometry });

    let persisted = false;
    if (mongoose.connection.readyState === 1) {
      try {
        await Simulation.create({
          requestId,
          userId: req.user?.id ? String(req.user.id) : null,
          inputs,
          derivedGeometry: geometry,
          weather,
          result
        });
        persisted = true;
      } catch (error) {
        console.warn(`[ShelterX] Persistence skipped: ${error.message}`);
      }
    }

    return res.json({
      success: true,
      requestId,
      schemaVersion,
      persisted,
      inputs,
      derivedGeometry: geometry,
      weather,
      result
    });
  } catch (error) {
    console.error('[ShelterX] /simulate failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Simulation request failed safely.',
      error: error.message
    });
  }
});

export default router;
