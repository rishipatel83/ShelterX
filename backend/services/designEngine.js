/**
 * Future connection point for:
 * - the user's material CSV/JSON
 * - ANSYS-derived dataset
 * - ML inference
 * - cost calculation
 * - budget filtering
 *
 * No thermal, cost, or recommendation values are fabricated here.
 */
export const evaluateDesign = async ({ inputs, weather, geometry }) => ({
  status: 'waiting-for-user-datasets',
  thermal: null,
  cost: inputs.budgetINR === undefined ? null : {
    budgetINR: inputs.budgetINR,
    estimatedTotalCostINR: null,
    withinBudget: null
  },
  recommendation: null,
  context: { weather, geometry }
});
