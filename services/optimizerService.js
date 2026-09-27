import { getCostOptions } from './costService.js';


const isFiniteNumber = (value) =>
  Number.isFinite(Number(value));


/*
|--------------------------------------------------------------------------
| getComparableCost()
|--------------------------------------------------------------------------
|
| Returns the cost value we can safely compare.
|
| If GST is known:
|   knownTotalINR is used.
|
| If GST is unknown:
|   materialSubtotalINR is only a partial estimate.
*/
const getComparableCost = (option) => {
  if (!option?.calculable) {
    return null;
  }

  if (
    option.pricing?.completeFinalCostKnown &&
    isFiniteNumber(option.pricing?.knownTotalINR)
  ) {
    return Number(
      option.pricing.knownTotalINR
    );
  }

  if (
    isFiniteNumber(
      option.pricing?.materialSubtotalINR
    )
  ) {
    return Number(
      option.pricing.materialSubtotalINR
    );
  }

  return null;
};


/*
|--------------------------------------------------------------------------
| getBudgetStatus()
|--------------------------------------------------------------------------
*/
const getBudgetStatus = ({
  option,
  budgetINR
}) => {
  if (!isFiniteNumber(budgetINR)) {
    return {
      status: 'budget-not-provided',
      withinBudget: null,
      differenceINR: null
    };
  }

  const budget = Number(budgetINR);

  /*
  | Cost service may already know the answer.
  */
  if (option?.budget?.withinBudget === true) {
    return {
      status: 'within-budget',
      withinBudget: true,
      differenceINR:
        option.budget
          .budgetRemainingINR ?? null
    };
  }

  if (option?.budget?.withinBudget === false) {
    return {
      status: 'over-budget',
      withinBudget: false,
      differenceINR:
        option.budget
          .budgetRemainingINR ?? null
    };
  }

  /*
  | When GST/final charges are incomplete we do not invent
  | a final affordability result.
  */
  const comparableCost =
    getComparableCost(option);

  if (
    comparableCost !== null &&
    comparableCost > budget
  ) {
    return {
      status: 'over-budget',
      withinBudget: false,
      differenceINR:
        budget - comparableCost
    };
  }

  return {
    status: 'final-cost-incomplete',
    withinBudget: null,
    differenceINR: null
  };
};


/*
|--------------------------------------------------------------------------
| prepareCandidate()
|--------------------------------------------------------------------------
*/
const prepareCandidate = ({
  option,
  budgetINR
}) => {
  const budgetStatus =
    getBudgetStatus({
      option,
      budgetINR
    });

  return {
    ...option,

    optimization: {
      budgetStatus:
        budgetStatus.status,

      withinBudget:
        budgetStatus.withinBudget,

      budgetDifferenceINR:
        budgetStatus.differenceINR,

      comparableCostINR:
        getComparableCost(option),

      /*
      | Thermal recommendation is intentionally not fabricated.
      | Later ML/validated physics output will be attached here.
      */
      thermalScore: null,

      thermalStatus:
        'not-ranked-by-thermal-performance'
    }
  };
};


/*
|--------------------------------------------------------------------------
| sortCandidates()
|--------------------------------------------------------------------------
|
| Current ranking uses only cost feasibility.
|
| We DO NOT pretend to perform final thermal optimization yet.
|
| When the validated thermal model is connected later,
| thermal performance will become another dynamic input.
*/
const sortCandidates = (
  candidates,
  budgetProvided
) => {
  return [...candidates].sort(
    (a, b) => {

      if (budgetProvided) {
        const priority = {
          'within-budget': 0,
          'final-cost-incomplete': 1,
          'over-budget': 2,
          'budget-not-provided': 3
        };

        const statusDifference =
          (
            priority[
              a.optimization
                .budgetStatus
            ] ?? 99
          ) -
          (
            priority[
              b.optimization
                .budgetStatus
            ] ?? 99
          );

        if (statusDifference !== 0) {
          return statusDifference;
        }
      }

      const costA =
        a.optimization
          .comparableCostINR;

      const costB =
        b.optimization
          .comparableCostINR;

      if (
        costA === null &&
        costB === null
      ) {
        return 0;
      }

      if (costA === null) {
        return 1;
      }

      if (costB === null) {
        return -1;
      }

      return costA - costB;
    }
  );
};


/*
|--------------------------------------------------------------------------
| optimizeBudgetOptions()
|--------------------------------------------------------------------------
|
| MAIN FUNCTION
|
| Everything comes dynamically from:
|
| frontend input
|       +
| MongoDB pricing
|       +
| product information
|
| Nothing is tied to a fixed supplier or material.
*/
export const optimizeBudgetOptions =
  async ({
    dimensions,

    surfaceType,
    requiredAreaM2,

    thicknessMm,
    budgetINR,

    priceFamily,

    state,
    city,
    country,

    matchType,

    priority
  }) => {

    /*
    |--------------------------------------------------------------------------
    | Get dynamic cost options
    |--------------------------------------------------------------------------
    */

    const costResult =
      await getCostOptions({
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
      });


    /*
    |--------------------------------------------------------------------------
    | Ignore prices that cannot currently be calculated
    |--------------------------------------------------------------------------
    */

    const calculable =
      costResult.options.filter(
        (option) =>
          option.calculable
      );


    /*
    |--------------------------------------------------------------------------
    | Remove products that are known to be incompatible
    | with the requested thickness.
    |--------------------------------------------------------------------------
    */

    const compatible =
      calculable.filter(
        (option) =>
          option
            .thicknessCompatibility
            ?.compatible !== false
      );


    /*
    |--------------------------------------------------------------------------
    | Prepare candidates
    |--------------------------------------------------------------------------
    */

    const candidates =
      compatible.map(
        (option) =>
          prepareCandidate({
            option,
            budgetINR
          })
      );


    const budgetProvided =
      isFiniteNumber(budgetINR);


    const sortedCandidates =
      sortCandidates(
        candidates,
        budgetProvided
      );


    /*
    |--------------------------------------------------------------------------
    | Safely select a budget candidate
    |--------------------------------------------------------------------------
    |
    | We only call something a confirmed budget option when the
    | complete known price is available and it is within budget.
    |
    | We do NOT claim this is the final thermal recommendation yet.
    |--------------------------------------------------------------------------
    */

    const confirmedBudgetOptions =
      sortedCandidates.filter(
        (candidate) =>
          candidate.optimization
            .withinBudget === true &&
          candidate.pricing
            ?.completeFinalCostKnown === true
      );


    const lowestKnownCostOption =
      sortedCandidates.find(
        (candidate) =>
          candidate.optimization
            .comparableCostINR !== null
      ) ?? null;


    const budgetCandidate =
      confirmedBudgetOptions[0] ??
      null;


    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return {
      optimizationStatus:
        sortedCandidates.length > 0
          ? 'cost-optimization-complete'
          : 'no-calculable-price-options',

      thermalOptimizationStatus:
        'not-ranked-by-thermal-performance',

      /*
      | Keep the user's priority.
      | Do not invent behaviour if the thermal model needed to honor
      | that priority is not connected yet.
      */
      requestedPriority:
        priority ?? null,

      budgetINR:
        budgetProvided
          ? Number(budgetINR)
          : null,

      requiredAreaM2:
        costResult.requiredAreaM2,

      totals: {
        databasePriceOptions:
          costResult.optionCount,

        calculableOptions:
          costResult
            .calculableOptionCount,

        thicknessCompatibleOptions:
          compatible.length,

        confirmedWithinBudgetOptions:
          confirmedBudgetOptions.length
      },

      /*
      | This is a COST candidate only.
      |
      | Later ML/physics decides whether it is also thermally suitable.
      */
      budgetCandidate,

      lowestKnownCostOption,

      candidates:
        sortedCandidates,

      pricingSnapshotAt:
        costResult.snapshotAt,

      notes: {
        recommendation:
          'Cost candidates are not ranked by thermal performance; the validated conduction result is returned separately by the simulation API.',

        pricing:
          'Prices are read dynamically from MongoDB.',

        incompleteCosts:
          'Transport, installation, unknown GST, or other unavailable charges are not invented.'
      }
    };
  };


export default {
  optimizeBudgetOptions
};