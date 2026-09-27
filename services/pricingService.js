import MaterialPrice from '../models/materialPrice.js';

// Import these so Mongoose registers the referenced models
// used by populate().
import '../models/materialProduct.js';
import '../models/supplier.js';

/*
|--------------------------------------------------------------------------
| Helper: safe exact text filter
|--------------------------------------------------------------------------
| Makes filters case-insensitive without allowing special regex characters
| from user input to change the query.
*/
const exactTextRegex = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const escaped = value
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`^${escaped}$`, 'i');
};


/*
|--------------------------------------------------------------------------
| Helper: convert MongoDB document into clean pricing object
|--------------------------------------------------------------------------
*/
const formatPriceQuote = (priceDocument) => {
  const product = priceDocument.productId;

  if (!product) {
    return null;
  }

  const supplier = product.supplierId ?? null;

  return {
    priceId: priceDocument._id?.toString() ?? null,
    externalPriceCode: priceDocument.externalPriceCode ?? null,

    price: {
      amountINR: priceDocument.priceInr,
      unit: priceDocument.priceUnit,
      currency: priceDocument.currency ?? 'INR',
      gstPercent: priceDocument.gstPercent ?? null,

      minimumOrderQty:
        priceDocument.minimumOrderQty ?? null,

      minimumOrderUnit:
        priceDocument.minimumOrderUnit ?? null
    },

    location: {
      region: priceDocument.region ?? null,
      city: priceDocument.city ?? null,
      state: priceDocument.state ?? null,
      country: priceDocument.country ?? null
    },

    validity: {
      validFrom: priceDocument.validFrom ?? null,
      validUntil: priceDocument.validUntil ?? null,
      sourceCheckedAt:
        priceDocument.sourceCheckedAt ?? null
    },

    matchType: priceDocument.matchType ?? null,

    product: {
      id: product._id?.toString() ?? null,

      externalProductCode:
        product.externalProductCode ?? null,

      productName:
        product.productName ?? null,

      priceFamily:
        product.priceFamily ?? null,

      materialId:
        product.materialId?.toString?.() ?? null,

      thicknessMinMm:
        product.thicknessMinMm ?? null,

      thicknessMaxMm:
        product.thicknessMaxMm ?? null,

      densityMinKgM3:
        product.densityMinKgM3 ?? null,

      densityMaxKgM3:
        product.densityMaxKgM3 ?? null,

      pieceLengthM:
        product.pieceLengthM ?? null,

      pieceWidthM:
        product.pieceWidthM ?? null,

      pieceThicknessMm:
        product.pieceThicknessMm ?? null,

      coverageAreaM2:
        product.coverageAreaM2 ?? null,

      volumeM3PerPiece:
        product.volumeM3PerPiece ?? null,

      sourceProductUrl:
        product.sourceProductUrl ?? null,

      availabilityStatus:
        product.availabilityStatus ?? null,

      notes:
        product.notes ?? null
    },

    supplier: supplier
      ? {
          id: supplier._id?.toString() ?? null,
          name: supplier.name ?? null,
          website: supplier.website ?? null,
          city: supplier.city ?? null,
          state: supplier.state ?? null,
          country: supplier.country ?? null
        }
      : null,

    source: {
      url: priceDocument.sourceUrl ?? null,
      checkedAt:
        priceDocument.sourceCheckedAt ?? null,
      notes:
        priceDocument.notes ?? null
    }
  };
};


/*
|--------------------------------------------------------------------------
| getActivePriceQuotes()
|--------------------------------------------------------------------------
|
| Reads active market prices dynamically from MongoDB.
|
| Optional filters:
|   priceFamily
|   state
|   city
|   country
|   matchType
|   includeExpired
|
| Example:
|
| getActivePriceQuotes({
|   priceFamily: 'PUF_INSULATED_PANEL',
|   state: 'Gujarat'
| })
|
*/
export const getActivePriceQuotes = async ({
  priceFamily,
  state,
  city,
  country,
  matchType,
  includeExpired = false
} = {}) => {

  const now = new Date();

  /*
  |--------------------------------------------------------------------------
  | Price-level MongoDB filter
  |--------------------------------------------------------------------------
  */

  const priceQuery = {
    isActive: true
  };

  const stateRegex = exactTextRegex(state);
  const cityRegex = exactTextRegex(city);
  const countryRegex = exactTextRegex(country);
  const matchTypeRegex = exactTextRegex(matchType);

  if (stateRegex) {
    priceQuery.state = stateRegex;
  }

  if (cityRegex) {
    priceQuery.city = cityRegex;
  }

  if (countryRegex) {
    priceQuery.country = countryRegex;
  }

  if (matchTypeRegex) {
    priceQuery.matchType = matchTypeRegex;
  }


  /*
  |--------------------------------------------------------------------------
  | Ignore expired/future prices unless explicitly requested
  |--------------------------------------------------------------------------
  */

  if (!includeExpired) {
    priceQuery.$and = [
      {
        $or: [
          { validFrom: null },
          { validFrom: { $lte: now } }
        ]
      },
      {
        $or: [
          { validUntil: null },
          { validUntil: { $gte: now } }
        ]
      }
    ];
  }


  /*
  |--------------------------------------------------------------------------
  | Product-level filter
  |--------------------------------------------------------------------------
  */

  const productMatch = {
    isActive: true
  };

  const familyRegex = exactTextRegex(priceFamily);

  if (familyRegex) {
    productMatch.priceFamily = familyRegex;
  }


  /*
  |--------------------------------------------------------------------------
  | Query MongoDB
  |--------------------------------------------------------------------------
  */

  const priceDocuments = await MaterialPrice
    .find(priceQuery)

    .populate({
      path: 'productId',

      match: productMatch,

      populate: {
        path: 'supplierId',

        match: {
          isActive: true
        }
      }
    })

    .sort({
      sourceCheckedAt: -1,
      updatedAt: -1
    })

    .lean();


  /*
  |--------------------------------------------------------------------------
  | Remove prices whose product did not match our filter
  |--------------------------------------------------------------------------
  */

  const quotes = priceDocuments
    .filter(
      (price) =>
        price.productId &&
        price.productId.supplierId
    )
    .map(formatPriceQuote)
    .filter(Boolean);


  return {
    count: quotes.length,

    filters: {
      priceFamily:
        priceFamily ?? null,

      state:
        state ?? null,

      city:
        city ?? null,

      country:
        country ?? null,

      matchType:
        matchType ?? null,

      includeExpired
    },

    snapshotAt:
      new Date().toISOString(),

    quotes
  };
};


/*
|--------------------------------------------------------------------------
| getPriceQuoteByCode()
|--------------------------------------------------------------------------
| Useful when a simulation already knows the external price code.
*/
export const getPriceQuoteByCode = async (
  externalPriceCode
) => {

  if (
    typeof externalPriceCode !== 'string' ||
    externalPriceCode.trim() === ''
  ) {
    throw new Error(
      'externalPriceCode is required.'
    );
  }

  const priceDocument = await MaterialPrice
    .findOne({
      externalPriceCode:
        externalPriceCode.trim(),

      isActive: true
    })

    .populate({
      path: 'productId',

      match: {
        isActive: true
      },

      populate: {
        path: 'supplierId',

        match: {
          isActive: true
        }
      }
    })

    .lean();


  if (
    !priceDocument ||
    !priceDocument.productId ||
    !priceDocument.productId.supplierId
  ) {
    return null;
  }

  return formatPriceQuote(priceDocument);
};


/*
|--------------------------------------------------------------------------
| getAvailablePriceFamilies()
|--------------------------------------------------------------------------
| Returns the price families that actually have active market pricing.
|
| No price families are hardcoded here.
*/
export const getAvailablePriceFamilies = async () => {

  const result =
    await getActivePriceQuotes();

  const families = [
    ...new Set(
      result.quotes
        .map(
          (quote) =>
            quote.product.priceFamily
        )
        .filter(Boolean)
    )
  ];

  return families.sort();
};


export default {
  getActivePriceQuotes,
  getPriceQuoteByCode,
  getAvailablePriceFamilies
};