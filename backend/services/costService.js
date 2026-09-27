import { getActivePriceQuotes } from './pricingService.js';

/*
|--------------------------------------------------------------------------
| Universal unit conversion
|--------------------------------------------------------------------------
| This is a physical conversion constant, NOT a ShelterX hardcoded value.
*/
const SQUARE_FOOT_TO_SQUARE_METER = 0.09290304;


/*
|--------------------------------------------------------------------------
| Helper
|--------------------------------------------------------------------------
*/
const isPositiveNumber = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0;


/*
|--------------------------------------------------------------------------
| calculateShelterAreas()
|--------------------------------------------------------------------------
| All dimensions come dynamically from frontend/user input.
|
| length, width, height are expected in metres.
*/
export const calculateShelterAreas = (dimensions) => {
  if (!dimensions) {
    throw new Error('Shelter dimensions are required.');
  }

  const length = Number(dimensions.length);
  const width = Number(dimensions.width);
  const height = Number(dimensions.height);

  if (
    !isPositiveNumber(length) ||
    !isPositiveNumber(width) ||
    !isPositiveNumber(height)
  ) {
    throw new Error(
      'Length, width and height must be positive numbers.'
    );
  }

  const wallAreaM2 =
    2 * (length * height) +
    2 * (width * height);

  const roofAreaM2 = length * width;

  const floorAreaM2 = length * width;

  return {
    wallAreaM2,
    roofAreaM2,
    floorAreaM2,

    wallsAndRoofAreaM2:
      wallAreaM2 + roofAreaM2,

    fullEnvelopeAreaM2:
      wallAreaM2 +
      roofAreaM2 +
      floorAreaM2
  };
};


/*
|--------------------------------------------------------------------------
| resolveRequiredArea()
|--------------------------------------------------------------------------
|
| We do NOT assume where the material will be used.
|
| surfaceType must tell the service whether pricing is for:
| - walls
| - roof
| - floor
| - walls_and_roof
| - full_envelope
|
| A future module can also directly provide requiredAreaM2.
*/
export const resolveRequiredArea = ({
  dimensions,
  surfaceType,
  requiredAreaM2
}) => {
  if (isPositiveNumber(requiredAreaM2)) {
    return Number(requiredAreaM2);
  }

  if (!surfaceType) {
    throw new Error(
      'surfaceType or requiredAreaM2 is required.'
    );
  }

  const areas = calculateShelterAreas(dimensions);

  switch (surfaceType) {
    case 'walls':
      return areas.wallAreaM2;

    case 'roof':
      return areas.roofAreaM2;

    case 'floor':
      return areas.floorAreaM2;

    case 'walls_and_roof':
      return areas.wallsAndRoofAreaM2;

    case 'full_envelope':
      return areas.fullEnvelopeAreaM2;

    default:
      throw new Error(
        `Unsupported surfaceType: ${surfaceType}`
      );
  }
};


/*
|--------------------------------------------------------------------------
| getPieceCoverageArea()
|--------------------------------------------------------------------------
|
| For supplier prices quoted per piece/panel.
|
| First uses coverageAreaM2 from MongoDB.
| If unavailable, derives area dynamically from product dimensions.
*/
const getPieceCoverageArea = (product) => {
  if (isPositiveNumber(product?.coverageAreaM2)) {
    return Number(product.coverageAreaM2);
  }

  if (
    isPositiveNumber(product?.pieceLengthM) &&
    isPositiveNumber(product?.pieceWidthM)
  ) {
    return (
      Number(product.pieceLengthM) *
      Number(product.pieceWidthM)
    );
  }

  return null;
};


/*
|--------------------------------------------------------------------------
| checkThicknessCompatibility()
|--------------------------------------------------------------------------
|
| Checks whether a requested user thickness is compatible with the
| supplier product record.
|
| It does NOT invent a thickness if the user/product did not provide one.
*/
const checkThicknessCompatibility = (
  requestedThicknessMm,
  product
) => {
  if (!isPositiveNumber(requestedThicknessMm)) {
    return {
      checked: false,
      compatible: null,
      reason: 'No requested thickness supplied.'
    };
  }

  const requested = Number(requestedThicknessMm);

  const min = isPositiveNumber(product?.thicknessMinMm)
    ? Number(product.thicknessMinMm)
    : null;

  const max = isPositiveNumber(product?.thicknessMaxMm)
    ? Number(product.thicknessMaxMm)
    : null;

  const exactPieceThickness =
    isPositiveNumber(product?.pieceThicknessMm)
      ? Number(product.pieceThicknessMm)
      : null;

  if (min !== null && requested < min) {
    return {
      checked: true,
      compatible: false,
      reason:
        `Requested thickness ${requested} mm is below ` +
        `product minimum ${min} mm.`
    };
  }

  if (max !== null && requested > max) {
    return {
      checked: true,
      compatible: false,
      reason:
        `Requested thickness ${requested} mm is above ` +
        `product maximum ${max} mm.`
    };
  }

  if (
    min === null &&
    max === null &&
    exactPieceThickness !== null &&
    requested !== exactPieceThickness
  ) {
    return {
      checked: true,
      compatible: false,
      reason:
        `Requested thickness ${requested} mm does not match ` +
        `product thickness ${exactPieceThickness} mm.`
    };
  }

  if (
    min === null &&
    max === null &&
    exactPieceThickness === null
  ) {
    return {
      checked: false,
      compatible: null,
      reason:
        'Product does not provide enough thickness information.'
    };
  }

  return {
    checked: true,
    compatible: true,
    reason: 'Requested thickness is compatible.'
  };
};


/*
|--------------------------------------------------------------------------
| applyMinimumOrder()
|--------------------------------------------------------------------------
|
| Applies minimum order only when MongoDB tells us the minimum quantity
| uses the SAME unit as the supplier price.
|
| We never guess how to convert an unknown minimum-order unit.
*/
const applyMinimumOrder = ({
  requiredQuantity,
  priceUnit,
  minimumOrderQty,
  minimumOrderUnit
}) => {
  if (
    !isPositiveNumber(minimumOrderQty) ||
    !minimumOrderUnit
  ) {
    return {
      billedQuantity: requiredQuantity,
      minimumOrderApplied: false
    };
  }

  const normalizedMinimumUnit =
    String(minimumOrderUnit)
      .trim()
      .toLowerCase();

  const normalizedPriceUnit =
    String(priceUnit)
      .trim()
      .toLowerCase();

  if (normalizedMinimumUnit !== normalizedPriceUnit) {
    return {
      billedQuantity: requiredQuantity,
      minimumOrderApplied: false,
      note:
        'Minimum-order unit differs from price unit, so it was not ' +
        'automatically converted.'
    };
  }

  const minimum = Number(minimumOrderQty);

  return {
    billedQuantity:
      Math.max(requiredQuantity, minimum),

    minimumOrderApplied:
      minimum > requiredQuantity
  };
};


/*
|--------------------------------------------------------------------------
| calculateCostForQuote()
|--------------------------------------------------------------------------
|
| Converts one supplier quote into an actual cost for the user's shelter.
|
| Supported database units:
| - square_meter
| - square_foot
| - cubic_meter
| - piece
*/
export const calculateCostForQuote = ({
  quote,
  dimensions,
  surfaceType,
  requiredAreaM2,
  thicknessMm,
  budgetINR
}) => {
  if (!quote?.price) {
    throw new Error('A valid price quote is required.');
  }

  const areaM2 = resolveRequiredArea({
    dimensions,
    surfaceType,
    requiredAreaM2
  });

  const priceAmount = Number(
    quote.price.amountINR
  );

  if (!isPositiveNumber(priceAmount)) {
    return {
      calculable: false,
      reason: 'Price amount is missing or invalid.',
      quote
    };
  }

  const priceUnit = quote.price.unit;

  let requiredQuantity = null;
  let quantityUnit = null;
  let requiredPieces = null;
  let requiredVolumeM3 = null;

  switch (priceUnit) {
    /*
    |----------------------------------------------------------------------
    | ₹ per square metre
    |----------------------------------------------------------------------
    */
    case 'square_meter':
      requiredQuantity = areaM2;
      quantityUnit = 'square_meter';
      break;


    /*
    |----------------------------------------------------------------------
    | ₹ per square foot
    |----------------------------------------------------------------------
    */
    case 'square_foot':
      requiredQuantity =
        areaM2 / SQUARE_FOOT_TO_SQUARE_METER;

      quantityUnit = 'square_foot';
      break;


    /*
    |----------------------------------------------------------------------
    | ₹ per cubic metre
    |----------------------------------------------------------------------
    |
    | Volume depends on the user/design thickness.
    */
    case 'cubic_meter': {
      if (!isPositiveNumber(thicknessMm)) {
        return {
          calculable: false,
          reason:
            'Thickness is required for cubic-metre pricing.',
          quote
        };
      }

      const thicknessM =
        Number(thicknessMm) / 1000;

      requiredVolumeM3 =
        areaM2 * thicknessM;

      requiredQuantity =
        requiredVolumeM3;

      quantityUnit = 'cubic_meter';

      break;
    }


    /*
    |----------------------------------------------------------------------
    | ₹ per physical panel/piece
    |----------------------------------------------------------------------
    */
    case 'piece': {
      const coverageAreaM2 =
        getPieceCoverageArea(
          quote.product
        );

      if (!isPositiveNumber(coverageAreaM2)) {
        return {
          calculable: false,
          reason:
            'Piece price cannot be calculated because the product ' +
            'does not provide coverage area or usable dimensions.',
          quote
        };
      }

      requiredPieces =
        Math.ceil(
          areaM2 / coverageAreaM2
        );

      requiredQuantity =
        requiredPieces;

      quantityUnit = 'piece';

      break;
    }


    default:
      return {
        calculable: false,
        reason:
          `Unsupported price unit: ${priceUnit}`,
        quote
      };
  }


  /*
  |--------------------------------------------------------------------------
  | Minimum order
  |--------------------------------------------------------------------------
  */
  const minimumOrderResult =
    applyMinimumOrder({
      requiredQuantity,

      priceUnit,

      minimumOrderQty:
        quote.price.minimumOrderQty,

      minimumOrderUnit:
        quote.price.minimumOrderUnit
    });

  const billedQuantity =
    minimumOrderResult.billedQuantity;


  /*
  |--------------------------------------------------------------------------
  | Material subtotal
  |--------------------------------------------------------------------------
  */
  const materialSubtotalINR =
    billedQuantity * priceAmount;


  /*
  |--------------------------------------------------------------------------
  | GST
  |--------------------------------------------------------------------------
  |
  | GST is calculated ONLY if MongoDB has a GST percentage.
  | No default tax percentage is invented.
  */
  const hasKnownGST =
    Number.isFinite(
      Number(quote.price.gstPercent)
    );

  const gstPercent =
    hasKnownGST
      ? Number(quote.price.gstPercent)
      : null;

  const gstINR =
    hasKnownGST
      ? materialSubtotalINR *
        (gstPercent / 100)
      : null;


  /*
  |--------------------------------------------------------------------------
  | Known total
  |--------------------------------------------------------------------------
  */
  const knownTotalINR =
    materialSubtotalINR +
    (gstINR ?? 0);


  /*
  |--------------------------------------------------------------------------
  | Budget comparison
  |--------------------------------------------------------------------------
  |
  | If GST is unknown and subtotal is below budget,
  | we cannot honestly claim the final price is within budget.
  |
  | But if subtotal already exceeds budget, it is definitely over budget.
  */
  let withinBudget = null;
  let budgetRemainingINR = null;
  let knownComponentsWithinBudget = null;

  if (
    budgetINR !== undefined &&
    budgetINR !== null &&
    Number.isFinite(Number(budgetINR))
  ) {
    const budget = Number(budgetINR);
    const knownCostForComparison = hasKnownGST
      ? knownTotalINR
      : materialSubtotalINR;

    knownComponentsWithinBudget =
      knownCostForComparison <= budget;

    budgetRemainingINR =
      budget - knownCostForComparison;

    // Transport and installation are still unknown, so we can only make
    // a definitive affordability statement when the already-known cost
    // exceeds the user's budget.
    if (knownCostForComparison > budget) {
      withinBudget = false;
    }
  }


  const thicknessCompatibility =
    checkThicknessCompatibility(
      thicknessMm,
      quote.product
    );


  return {
    calculable: true,

    priceId:
      quote.priceId,

    productId:
      quote.product?.id ?? null,

    supplierId:
      quote.supplier?.id ?? null,

    materialId:
      quote.product?.materialId ?? null,

    priceFamily:
      quote.product?.priceFamily ?? null,

    productName:
      quote.product?.productName ?? null,

    supplier:
      quote.supplier ?? null,

    location:
      quote.location ?? null,

    matchType:
      quote.matchType ?? null,

    requirement: {
      surfaceType:
        surfaceType ?? null,

      requiredAreaM2:
        areaM2,

      requestedThicknessMm:
        isPositiveNumber(thicknessMm)
          ? Number(thicknessMm)
          : null,

      requiredVolumeM3,

      requiredPieces,

      requiredQuantity,

      billedQuantity,

      quantityUnit,

      minimumOrderApplied:
        minimumOrderResult
          .minimumOrderApplied,

      minimumOrderNote:
        minimumOrderResult.note ?? null
    },

    thicknessCompatibility,

    pricing: {
      priceINR:
        priceAmount,

      priceUnit,

      currency:
        quote.price.currency ?? 'INR',

      materialSubtotalINR,

      gstPercent,

      gstINR,

      // Compatibility field: this is the sum of the cost components that
      // are actually known, NOT a complete installed-project total.
      knownTotalINR,
      knownMaterialPlusTaxTotalINR: hasKnownGST
        ? knownTotalINR
        : null,

      /*
      | Transport and installation are intentionally not invented.
      */
      transportCostINR: null,
      installationCostINR: null,

      completeFinalCostKnown: false,

      note:
        hasKnownGST
          ? 'Material price and recorded GST are known; transport and installation remain unknown.'
          : 'Material price is known; GST, transport and installation are incomplete.'
    },

    budget: {
      budgetINR:
        budgetINR !== undefined &&
        budgetINR !== null
          ? Number(budgetINR)
          : null,

      withinBudget,

      knownComponentsWithinBudget,

      budgetRemainingINR
    },

    source: quote.source ?? null
  };
};


/*
|--------------------------------------------------------------------------
| getCostOptions()
|--------------------------------------------------------------------------
|
| This is the main function the optimizer will use.
|
| Flow:
| MongoDB prices
|      ↓
| calculate quantity required
|      ↓
| calculate cost for each quote
|
| Nothing is hardcoded to one supplier/material/price.
*/
export const getCostOptions = async ({
  dimensions,
  surfaceType,
  requiredAreaM2,
  thicknessMm,
  budgetINR,

  priceFamily,
  state,
  city,
  country,
  matchType
}) => {
  const pricingResult =
    await getActivePriceQuotes({
      priceFamily,
      state,
      city,
      country,
      matchType
    });

  const options =
    pricingResult.quotes.map(
      (quote) =>
        calculateCostForQuote({
          quote,
          dimensions,
          surfaceType,
          requiredAreaM2,
          thicknessMm,
          budgetINR
        })
    );

  return {
    snapshotAt:
      pricingResult.snapshotAt,

    requiredAreaM2:
      resolveRequiredArea({
        dimensions,
        surfaceType,
        requiredAreaM2
      }),

    optionCount:
      options.length,

    calculableOptionCount:
      options.filter(
        (option) =>
          option.calculable
      ).length,

    options
  };
};


export default {
  calculateShelterAreas,
  resolveRequiredArea,
  calculateCostForQuote,
  getCostOptions
};