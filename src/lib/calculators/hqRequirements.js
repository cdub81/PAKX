const HQ_REQUIREMENT_SUMMARIES = [
  { level: 1, summary: "No requirements", requirementCount: 0 },
  { level: 2, summary: "Drill Ground: Level 1 | Squad: Level 1", requirementCount: 2 },
  { level: 3, summary: "Wall: Level 2 | Recon Plane: Level 1", requirementCount: 2 },
  { level: 4, summary: "Drill Ground: Level 3 | Barracks: Level 3", requirementCount: 2 },
  { level: 5, summary: "Wall: Level 4 | Barracks: Level 4", requirementCount: 2 },
  { level: 6, summary: "Wall: Level 5 | Drill Ground: Level 5", requirementCount: 2 },
  { level: 7, summary: "Wall: Level 6 | Troop Center: Level 6", requirementCount: 2 },
  { level: 8, summary: "Tech Center: Level 7 | Alliance Center: Level 7", requirementCount: 2 },
  { level: 9, summary: "Tech Center: Level 8 | Troop Center: Level 8", requirementCount: 2 },
  { level: 10, summary: "Tech Center: Level 9 | Hospital: Level 9", requirementCount: 2 },
  { level: 11, summary: "Tech Center: Level 10 | Wall: Level 10", requirementCount: 2 },
  { level: 12, summary: "Tech Center: Level 11 | Barracks: Level 11", requirementCount: 2 },
  { level: 13, summary: "Tech Center: Level 12 | Troop Center: Level 12", requirementCount: 2 },
  { level: 14, summary: "Tech Center: Level 13 | Drill Ground: Level 13", requirementCount: 2 },
  { level: 15, summary: "Tech Center: Level 14 | Wall: Level 14", requirementCount: 2 },
  { level: 16, summary: "Tech Center: Level 15 | Alliance Center: Level 15", requirementCount: 2 },
  { level: 17, summary: "Tech Center: Level 16 | Troop Center: Level 16", requirementCount: 2 },
  { level: 18, summary: "Tech Center: Level 17 | Hospital: Level 17", requirementCount: 2 },
  { level: 19, summary: "Tech Center: Level 18 | Wall: Level 18", requirementCount: 2 },
  { level: 20, summary: "Tech Center: Level 19 | Barracks: Level 19", requirementCount: 2 },
  { level: 21, summary: "Tech Center: Level 20 | Troop Center: Level 20", requirementCount: 2 },
  { level: 22, summary: "Tech Center: Level 21 | Drill Ground: Level 21", requirementCount: 2 },
  { level: 23, summary: "Tech Center: Level 22 | Wall: Level 22", requirementCount: 2 },
  { level: 24, summary: "Tech Center: Level 23 | Alliance Center: Level 23", requirementCount: 2 },
  { level: 25, summary: "Tech Center: Level 24 | Troop Center: Level 24", requirementCount: 2 },
  { level: 26, summary: "Tech Center: Level 25 | Hospital: Level 25", requirementCount: 2 },
  { level: 27, summary: "Tech Center: Level 26 | Wall: Level 26", requirementCount: 2 },
  { level: 28, summary: "Tech Center: Level 27 | Barracks: Level 27", requirementCount: 2 },
  { level: 29, summary: "Tech Center: Level 28 | Troop Center: Level 28", requirementCount: 2 },
  { level: 30, summary: "Tech Center: Level 29 | Drill Ground: Level 29", requirementCount: 2 },
  { level: 31, summary: "Tech Center: Level 30 | Barracks: Level 30 | Tank or Air or Missile Center: Level 30", requirementCount: 3 },
  { level: 32, summary: "Tech Center: Level 31 | Barracks: Level 31 | Tank or Air or Missile Center: Level 31 | Wall: Level 31", requirementCount: 4 },
  { level: 33, summary: "Tech Center: Level 32 | Barracks: Level 32 | Tank or Air or Missile Center: Level 32 | Hospital: Level 32 | Drill Ground: Level 32", requirementCount: 5 },
  { level: 34, summary: "Tech Center: Level 33 | Barracks: Level 33 | Tank or Air or Missile Center: Level 33 | Alliance Center: Level 33 | Wall: Level 33", requirementCount: 5 },
  { level: 35, summary: "Tech Center: Level 34 | Barracks: Level 34 | Tank or Air or Missile Center: Level 34 | Hospital: Level 34 | Drill Ground: Level 34", requirementCount: 5 }
];

const COST_BUILDING_ALIASES = {
  "Troop Center": "Tank/Air/Missile Center",
  "Tank or Air or Missile Center": "Tank/Air/Missile Center"
};

function clampHqLevel(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (Number.isNaN(parsed)) {
    return 1;
  }
  return Math.min(35, Math.max(1, parsed));
}

function parseRequirementSummary(summary) {
  if (!summary || summary === "No requirements") {
    return [];
  }

  return String(summary)
    .split(" | ")
    .map((entry) => {
      const [building, level] = entry.split(": Level ");
      const displayName = String(building || "").trim();
      return {
        building: displayName,
        costBuilding: COST_BUILDING_ALIASES[displayName] || displayName,
        requiredLevel: Number.parseInt(String(level || ""), 10) || 0
      };
    })
    .filter((entry) => entry.building);
}

function getHqRequirement(level) {
  const normalizedLevel = clampHqLevel(level);
  const match = HQ_REQUIREMENT_SUMMARIES.find((entry) => entry.level === normalizedLevel) || HQ_REQUIREMENT_SUMMARIES[0];
  return {
    ...match,
    requirements: parseRequirementSummary(match.summary)
  };
}

export {
  clampHqLevel,
  getHqRequirement
};
