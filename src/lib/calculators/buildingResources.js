import { clampHqLevel, getHqRequirement } from "./hqRequirements";

const BUILDING_COSTS = {
  Headquarters: {
    1: { gold: "0", iron: "30", food: "30", oil: "0" },
    2: { gold: "0", iron: "34", food: "34", oil: "0" },
    3: { gold: "0", iron: "340", food: "340", oil: "0" },
    4: { gold: "0", iron: "840", food: "840", oil: "0" },
    5: { gold: "0", iron: "6.80k", food: "6.80k", oil: "0" },
    6: { gold: "0", iron: "30.00k", food: "30.00k", oil: "0" },
    7: { gold: "0", iron: "61.00k", food: "61.00k", oil: "0" },
    8: { gold: "0", iron: "97.00k", food: "97.00k", oil: "0" },
    9: { gold: "100.00k", iron: "160.00k", food: "160.00k", oil: "0" },
    10: { gold: "120.00k", iron: "190.00k", food: "190.00k", oil: "0" },
    11: { gold: "300.00k", iron: "470.00k", food: "470.00k", oil: "0" },
    12: { gold: "510.00k", iron: "790.00k", food: "790.00k", oil: "0" },
    13: { gold: "560.00k", iron: "870.00k", food: "870.00k", oil: "0" },
    14: { gold: "780.00k", iron: "1.20M", food: "1.20M", oil: "0" },
    15: { gold: "1.10M", iron: "1.70M", food: "1.70M", oil: "0" },
    16: { gold: "1.90M", iron: "3.00M", food: "3.00M", oil: "0" },
    17: { gold: "2.50M", iron: "4.00M", food: "4.00M", oil: "0" },
    18: { gold: "4.40M", iron: "6.90M", food: "6.90M", oil: "0" },
    19: { gold: "5.30M", iron: "8.30M", food: "8.30M", oil: "0" },
    20: { gold: "9.60M", iron: "15.00M", food: "15.00M", oil: "0" },
    21: { gold: "13.00M", iron: "21.00M", food: "21.00M", oil: "0" },
    22: { gold: "17.00M", iron: "27.00M", food: "27.00M", oil: "0" },
    23: { gold: "22.00M", iron: "34.00M", food: "34.00M", oil: "0" },
    24: { gold: "27.00M", iron: "43.00M", food: "43.00M", oil: "0" },
    25: { gold: "46.00M", iron: "72.00M", food: "72.00M", oil: "0" },
    26: { gold: "65.00M", iron: "100.00M", food: "100.00M", oil: "0" },
    27: { gold: "84.00M", iron: "130.00M", food: "130.00M", oil: "0" },
    28: { gold: "120.00M", iron: "180.00M", food: "180.00M", oil: "0" },
    29: { gold: "170.00M", iron: "260.00M", food: "260.00M", oil: "0" },
    30: { gold: "230.00M", iron: "360.00M", food: "360.00M", oil: "0" },
    31: { gold: "250.00M", iron: "400.00M", food: "400.00M", oil: "562.50k" },
    32: { gold: "280.00M", iron: "440.00M", food: "440.00M", oil: "2.30M" },
    33: { gold: "310.00M", iron: "480.00M", food: "480.00M", oil: "3.92M" },
    34: { gold: "320.00M", iron: "500.00M", food: "500.00M", oil: "7.05M" },
    35: { gold: "340.00M", iron: "680.00M", food: "680.00M", oil: "14.10M" }
  },
  "Tech Center": {
    7: { gold: "0", iron: "210.00k", food: "210.00k", oil: "0" },
    8: { gold: "0", iron: "340.00k", food: "340.00k", oil: "0" },
    9: { gold: "170.00k", iron: "540.00k", food: "540.00k", oil: "0" },
    10: { gold: "210.00k", iron: "650.00k", food: "650.00k", oil: "0" },
    11: { gold: "520.00k", iron: "1.60M", food: "1.60M", oil: "0" },
    12: { gold: "890.00k", iron: "2.80M", food: "2.80M", oil: "0" },
    13: { gold: "980.00k", iron: "3.10M", food: "3.10M", oil: "0" },
    14: { gold: "1.40M", iron: "4.30M", food: "4.30M", oil: "0" },
    15: { gold: "1.90M", iron: "6.00M", food: "6.00M", oil: "0" },
    16: { gold: "3.40M", iron: "11.00M", food: "11.00M", oil: "0" },
    17: { gold: "4.40M", iron: "14.00M", food: "14.00M", oil: "0" },
    18: { gold: "7.80M", iron: "24.00M", food: "24.00M", oil: "0" },
    19: { gold: "9.30M", iron: "29.00M", food: "29.00M", oil: "0" },
    20: { gold: "17.00M", iron: "52.00M", food: "52.00M", oil: "0" },
    21: { gold: "23.00M", iron: "73.00M", food: "73.00M", oil: "0" },
    22: { gold: "30.00M", iron: "95.00M", food: "95.00M", oil: "0" },
    23: { gold: "38.00M", iron: "120.00M", food: "120.00M", oil: "0" },
    24: { gold: "48.00M", iron: "150.00M", food: "150.00M", oil: "0" },
    25: { gold: "81.00M", iron: "250.00M", food: "250.00M", oil: "0" },
    26: { gold: "110.00M", iron: "350.00M", food: "350.00M", oil: "0" },
    27: { gold: "150.00M", iron: "460.00M", food: "460.00M", oil: "0" },
    28: { gold: "210.00M", iron: "640.00M", food: "640.00M", oil: "0" },
    29: { gold: "290.00M", iron: "900.00M", food: "900.00M", oil: "0" },
    30: { gold: "400.00M", iron: "1.30G", food: "1.30G", oil: "0" },
    31: { gold: "440.00M", iron: "1.40G", food: "1.40G", oil: "810.00k" },
    32: { gold: "490.00M", iron: "1.50G", food: "1.50G", oil: "1.30M" },
    33: { gold: "540.00M", iron: "1.70G", food: "1.70G", oil: "2.20M" },
    34: { gold: "570.00M", iron: "1.80G", food: "1.80G", oil: "3.97M" }
  },
  Barracks: {
    3: { gold: "0", iron: "1.00k", food: "340", oil: "0" },
    4: { gold: "0", iron: "2.50k", food: "840", oil: "0" },
    11: { gold: "520.00k", iron: "1.60M", food: "1.60M", oil: "0" },
    19: { gold: "7.10M", iron: "25.00M", food: "8.30M", oil: "0" },
    27: { gold: "84.00M", iron: "390.00M", food: "130.00M", oil: "0" },
    30: { gold: "230.00M", iron: "1.10G", food: "360.00M", oil: "0" },
    31: { gold: "250.00M", iron: "1.20G", food: "400.00M", oil: "562.50k" },
    32: { gold: "280.00M", iron: "1.30G", food: "440.00M", oil: "900.00k" },
    33: { gold: "310.00M", iron: "1.40G", food: "480.00M", oil: "1.53M" },
    34: { gold: "320.00M", iron: "1.00G", food: "400.00M", oil: "1.76M" }
  },
  "Drill Ground": {
    1: { gold: "0", iron: "20", food: "60", oil: "0" },
    3: { gold: "0", iron: "840", food: "840", oil: "0" },
    5: { gold: "0", iron: "10.00k", food: "10.00k", oil: "0" },
    13: { gold: "560.00k", iron: "2.60M", food: "870.00k", oil: "0" },
    21: { gold: "13.00M", iron: "63.00M", food: "21.00M", oil: "0" },
    29: { gold: "170.00M", iron: "770.00M", food: "260.00M", oil: "0" },
    32: { gold: "280.00M", iron: "1.30G", food: "440.00M", oil: "900.00k" },
    34: { gold: "340.00M", iron: "1.00G", food: "270.00M", oil: "1.32M" }
  },
  Hospital: {
    9: { gold: "130.00k", iron: "470.00k", food: "160.00k", oil: "0" },
    17: { gold: "2.50M", iron: "12.00M", food: "4.00M", oil: "0" },
    25: { gold: "46.00M", iron: "220.00M", food: "72.00M", oil: "0" },
    32: { gold: "280.00M", iron: "1.30G", food: "440.00M", oil: "900.00k" },
    34: { gold: "500.00M", iron: "1.50G", food: "400.00M", oil: "1.32M" }
  },
  Wall: {
    2: { gold: "0", iron: "68", food: "23", oil: "0" },
    4: { gold: "0", iron: "2.50k", food: "840", oil: "0" },
    5: { gold: "0", iron: "20.00k", food: "6.80k", oil: "0" },
    6: { gold: "0", iron: "91.00k", food: "30.00k", oil: "0" },
    10: { gold: "160.00k", iron: "750.00k", food: "250.00k", oil: "0" },
    14: { gold: "1.00M", iron: "4.90M", food: "1.60M", oil: "0" },
    18: { gold: "5.90M", iron: "28.00M", food: "9.20M", oil: "0" },
    22: { gold: "23.00M", iron: "110.00M", food: "36.00M", oil: "0" },
    26: { gold: "86.00M", iron: "400.00M", food: "130.00M", oil: "0" },
    31: { gold: "250.00M", iron: "1.20G", food: "400.00M", oil: "562.50k" },
    33: { gold: "310.00M", iron: "1.40G", food: "480.00M", oil: "1.53M" }
  },
  "Alliance Center": {
    7: { gold: "0", iron: "180.00k", food: "180.00k", oil: "0" },
    15: { gold: "1.50M", iron: "7.60M", food: "2.50M", oil: "0" },
    23: { gold: "29.00M", iron: "140.00M", food: "45.00M", oil: "0" },
    33: { gold: "310.00M", iron: "1.40G", food: "480.00M", oil: "1.53M" }
  },
  "Tank/Air/Missile Center": {
    6: { gold: "0", iron: "91.00k", food: "30.00k", oil: "0" },
    8: { gold: "0", iron: "290.00k", food: "97.00k", oil: "0" },
    12: { gold: "510.00k", iron: "2.40M", food: "790.00k", oil: "0" },
    16: { gold: "1.90M", iron: "9.10M", food: "3.00M", oil: "0" },
    20: { gold: "9.60M", iron: "45.00M", food: "15.00M", oil: "0" },
    24: { gold: "27.00M", iron: "130.00M", food: "43.00M", oil: "0" },
    28: { gold: "120.00M", iron: "550.00M", food: "180.00M", oil: "0" },
    30: { gold: "230.00M", iron: "1.10G", food: "360.00M", oil: "0" },
    31: { gold: "250.00M", iron: "1.20G", food: "400.00M", oil: "562.50k" },
    32: { gold: "280.00M", iron: "1.30G", food: "440.00M", oil: "900.00k" },
    33: { gold: "310.00M", iron: "1.40G", food: "480.00M", oil: "1.53M" },
    34: { gold: "320.00M", iron: "1.50G", food: "500.00M", oil: "2.75M" }
  },
  "Recon Plane": {
    1: { gold: "0", iron: "0", food: "0", oil: "0", unavailable: true, note: "DATA NEEDED (level exists, costs unknown)" }
  }
};

const DISPLAY_BUILDING_NAMES = {
  Headquarters: "Headquarters",
  "Tech Center": "Tech Center",
  Barracks: "Barracks",
  "Drill Ground": "Drill Ground",
  Hospital: "Hospital",
  Wall: "Wall",
  "Alliance Center": "Alliance Center",
  "Tank/Air/Missile Center": "Tank / Air / Missile Center",
  "Recon Plane": "Recon Plane"
};

const ADDITIONAL_BUILDING_ORDER = [
  "Tech Center",
  "Barracks",
  "Drill Ground",
  "Hospital",
  "Wall",
  "Alliance Center",
  "Tank/Air/Missile Center"
];

function parseCompactAmount(value) {
  const text = String(value || "").trim();
  if (!text || text === "-" || text === "0") {
    return 0;
  }
  const match = text.replace(/,/g, "").match(/^([0-9]+(?:\.[0-9]+)?)([kKmMgG])?$/);
  if (!match) {
    return Number.parseFloat(text) || 0;
  }
  const amount = Number.parseFloat(match[1]) || 0;
  const suffix = String(match[2] || "").toUpperCase();
  if (suffix === "K") return amount * 1_000;
  if (suffix === "M") return amount * 1_000_000;
  if (suffix === "G") return amount * 1_000_000_000;
  return amount;
}

function formatCompactAmount(value) {
  const amount = Math.max(0, Number(value) || 0);
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}G`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}k`;
  return String(Math.round(amount));
}

function clampReductionPercent(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace("%", ""));
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.min(100, Math.max(0, parsed));
}

function normalizeCostEntry(costEntry) {
  return {
    gold: parseCompactAmount(costEntry?.gold),
    iron: parseCompactAmount(costEntry?.iron),
    food: parseCompactAmount(costEntry?.food),
    oil: parseCompactAmount(costEntry?.oil)
  };
}

function isUnavailableCostEntry(costEntry) {
  return !costEntry || costEntry.unavailable === true;
}

function applyReduction(costs, reductionPercent) {
  const multiplier = 1 - clampReductionPercent(reductionPercent) / 100;
  return {
    gold: Math.round(costs.gold * multiplier),
    iron: Math.round(costs.iron * multiplier),
    food: Math.round(costs.food * multiplier),
    oil: Math.round(costs.oil * multiplier)
  };
}

function buildUpgradeEntry(building, targetLevel, reductionPercent, options = {}) {
  const costEntry = BUILDING_COSTS[building]?.[targetLevel];
  const fromLevel = Math.max(0, targetLevel - 1);
  const label = options.displayLabel || DISPLAY_BUILDING_NAMES[building] || building;

  if (isUnavailableCostEntry(costEntry)) {
    return {
      key: `${building}-${targetLevel}`,
      building,
      label,
      fromLevel,
      targetLevel,
      missingCost: true,
      missingReason: String(costEntry?.note || ""),
      optionalChoice: Boolean(options.optionalChoice),
      reducedCosts: { gold: 0, iron: 0, food: 0, oil: 0 }
    };
  }

  const baseCosts = normalizeCostEntry(costEntry);
  return {
    key: `${building}-${targetLevel}`,
    building,
    label,
    fromLevel,
    targetLevel,
    optionalChoice: Boolean(options.optionalChoice),
    missingCost: false,
    missingReason: "",
    baseCosts,
    reducedCosts: applyReduction(baseCosts, reductionPercent)
  };
}

function accumulateTotals(entries) {
  return entries.reduce((totals, entry) => ({
    gold: totals.gold + (entry.reducedCosts?.gold || 0),
    iron: totals.iron + (entry.reducedCosts?.iron || 0),
    food: totals.food + (entry.reducedCosts?.food || 0),
    oil: totals.oil + (entry.reducedCosts?.oil || 0)
  }), { gold: 0, iron: 0, food: 0, oil: 0 });
}

function getBuildingOptions() {
  return ADDITIONAL_BUILDING_ORDER
    .filter((building) => getBuildingTargetLevels(building).length)
    .map((building) => ({
      value: building,
      label: DISPLAY_BUILDING_NAMES[building] || building
    }));
}

function getBuildingTargetLevels(building) {
  return Object.entries(BUILDING_COSTS[building] || {})
    .filter(([, costEntry]) => !isUnavailableCostEntry(costEntry))
    .map(([level]) => Number.parseInt(level, 10))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
}

function buildRequirementEntriesForHqLevel(level, reductionPercent = 0) {
  const normalizedLevel = clampHqLevel(level);
  if (normalizedLevel <= 1) {
    return [];
  }

  const requirement = getHqRequirement(normalizedLevel);
  return [
    buildUpgradeEntry("Headquarters", normalizedLevel, reductionPercent, { source: "hq" }),
    ...requirement.requirements.map((item) => buildUpgradeEntry(item.costBuilding || item.building, item.requiredLevel, reductionPercent, {
      optionalChoice: item.building === "Tank or Air or Missile Center",
      displayLabel: item.building,
      source: "hq"
    }))
  ];
}

function normalizeBuildingSelection(selection) {
  const building = selection?.building || getBuildingOptions()[0]?.value || "Tech Center";
  const levels = getBuildingTargetLevels(building);
  const targetLevel = levels.includes(Number(selection?.targetLevel))
    ? Number(selection?.targetLevel)
    : levels[0] || 1;

  return {
    id: selection?.id || "",
    building,
    targetLevel
  };
}

function buildAdditionalBuildingEntry(selection, reductionPercent = 0) {
  const normalized = normalizeBuildingSelection(selection);
  return {
    ...buildUpgradeEntry(normalized.building, normalized.targetLevel, reductionPercent, { source: "additional" }),
    selectionId: normalized.id,
    source: "additional"
  };
}

function getBuildingResourcesPlan({ startLevel = 1, targetLevel = 35, reductionPercent = 0, additionalBuildings = [] } = {}) {
  const normalizedStart = clampHqLevel(startLevel);
  const normalizedTarget = Math.max(normalizedStart, clampHqLevel(targetLevel));
  const hqEntries = [];

  for (let level = normalizedStart + 1; level <= normalizedTarget; level += 1) {
    hqEntries.push(...buildRequirementEntriesForHqLevel(level, reductionPercent).map((entry) => ({
      ...entry,
      sourceLevel: level
    })));
  }

  const extraEntries = additionalBuildings
    .map((selection) => buildAdditionalBuildingEntry(selection, reductionPercent))
    .map((entry) => ({
      ...entry,
      sourceLevel: entry.targetLevel
    }));

  const entries = [...hqEntries, ...extraEntries];
  const missingCosts = entries.filter((entry) => entry.missingCost);

  return {
    startLevel: normalizedStart,
    targetLevel: normalizedTarget,
    reductionPercent: clampReductionPercent(reductionPercent),
    entries,
    missingCosts,
    totals: accumulateTotals(entries.filter((entry) => !entry.missingCost))
  };
}

export {
  buildAdditionalBuildingEntry,
  clampReductionPercent,
  formatCompactAmount,
  getBuildingOptions,
  getBuildingResourcesPlan,
  getBuildingTargetLevels,
  normalizeBuildingSelection
};
