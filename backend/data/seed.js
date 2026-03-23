function makePlayer(name, rank, overallPower) {
  return { name, rank, overallPower };
}

function makeSlot(id, label, memberType, playerName) {
  return { id, label, memberType, playerName };
}

function makeSquad(id, label, slots) {
  return { id, label, slots };
}

const players = [
  makePlayer("DefenestranatorX", "R5", 37.3),
  makePlayer("Cdub81", "R4", 36),
  makePlayer("Sebby5683", "R4", 45.1),
  makePlayer("Gotchakwik", "R4", 41.5),
  makePlayer("Perky Petunia", "R4", 62.3),
  makePlayer("PleaseBeNice", "R4", 49.7),
  makePlayer("xEibon", "R4", 34.7),
  makePlayer("PlagusStein", "R4", 65.6),
  makePlayer("Zapatista09", "R4", 35.7),
  makePlayer("SlipumDeadHead", "R4", 31.7),
  makePlayer("Auti111", "R4", 44.7),
  makePlayer("champ234", "R3", 44.7),
  makePlayer("Patrick t", "R3", 29.1),
  makePlayer("Artorias of TheAbyss", "R3", 26.9),
  makePlayer("xxxxxxy5", "R3", 39.5),
  makePlayer("MelaniaAaa", "R3", 26.2),
  makePlayer("Cowanjo", "R3", 55.6),
  makePlayer("cassuhhdee", "R3", 23.8),
  makePlayer("Neron Cr", "R3", 41.3),
  makePlayer("Hydroplanist", "R3", 45.3),
  makePlayer("Jleehank", "R3", 40.9),
  makePlayer("ShadowFOX", "R3", 21.6),
  makePlayer("WGCSFV", "R3", 40.5),
  makePlayer("WiseWordz", "R3", 30.7),
  makePlayer("K Hole", "R3", 36.1),
  makePlayer("EAlon", "R3", 29.9),
  makePlayer("Moon Beast", "R3", 28.2),
  makePlayer("Mr 3 point 75", "R3", 36.9),
  makePlayer("Veneciano II", "R3", 75.1),
  makePlayer("Action Jackson 59", "R3", 29.6),
  makePlayer("Lostinthewoods", "R3", 25.1),
  makePlayer("King Kong SOS", "R3", 35.4),
  makePlayer("Tomsin72", "R3", 29),
  makePlayer("Kor Pepper", "R3", 30.1),
  makePlayer("Great Obliterator", "R3", 30),
  makePlayer("ZAlon", "R3", 17.9),
  makePlayer("브룩햄더슈", "R3", 37.7),
  makePlayer("rsltid", "R3", 37.7),
  makePlayer("FRoldo", "R3", 31.2),
  makePlayer("Rotrotomeo", "R3", 39.8),
  makePlayer("Lengendary Phoenix", "R3", 30.1),
  makePlayer("Akashi 明石", "R3", 33.7),
  makePlayer("GravyOC", "R3", 34.5),
  makePlayer("LtTally", "R3", 24.4),
  makePlayer("Zonedelta", "R3", 31.1),
  makePlayer("Ruby PR", "R3", 34.2),
  makePlayer("T Crazy 10", "R3", 31.8),
  makePlayer("파파로야", "R3", 30.3),
  makePlayer("Frainho", "R3", 31.5),
  makePlayer("DodoBirrrd", "R3", 28),
  makePlayer("Bedis1986", "R3", 42.4),
  makePlayer("wellinsjc", "R3", 25.1),
  makePlayer("Kronoid", "R3", 30.6),
  makePlayer("TwentyFifth Baam", "R3", 23.1),
  makePlayer("指揮官21a462023", "R3", 22.4),
  makePlayer("soldado006", "R3", 35.5),
  makePlayer("SrVizcaino", "R3", 35.8),
  makePlayer("Jagb2011", "R3", 38),
  makePlayer("Fernando Oliveira306", "R3", 23.1),
  makePlayer("BigMacFox", "R3", 31.5),
  makePlayer("Crolll", "R3", 30.1),
  makePlayer("IBEWsparky", "R3", 30.4),
  makePlayer("Magicplumb", "R3", 27.9),
  makePlayer("Dictad0r", "R3", 34.2),
  makePlayer("Zombie Slayer 64", "R3", 27.3),
  makePlayer("kaymack", "R3", 32.5),
  makePlayer("열린강당", "R3", 26.9),
  makePlayer("uatataC", "R3", 28.1),
  makePlayer("Pakxsmallwolf", "R3", 37.4),
  makePlayer("Jeeb1971", "R3", 40.5),
  makePlayer("Asya Go", "R3", 33.6),
  makePlayer("Ol Copper", "R3", 31.4),
  makePlayer("MandaPandaaa", "R3", 35.7),
  makePlayer("blackflag1", "R3", 30.6),
  makePlayer("Didovi", "R3", 21.4),
  makePlayer("Captain Fett", "R3", 49.2),
  makePlayer("Hippie Mike", "R3", 51),
  makePlayer("AChaosG", "R3", 31.7),
  makePlayer("BallouB", "R3", 44.9),
  makePlayer("Killin Zombs", "R3", 38.4),
  makePlayer("Bottled In Bond", "R3", 0),
  makePlayer("Ace 664", "R3", 0),
  makePlayer("DaggerSapper6", "R2", 19.6),
  makePlayer("King Ibra", "R2", 25.6),
  makePlayer("scubastevo", "R2", 22.1),
  makePlayer("G R A N D A O  SOS", "R2", 30.8),
  makePlayer("DuhStroia", "R3", 39.9),
  makePlayer("RangeCoach", "R3", 52.5),
  makePlayer("Amerinda", "R2", 26.5),
  makePlayer("SilentKnight61", "R3", 64.1),
  makePlayer("Budda254", "R2", 25.5),
  makePlayer("JuanManRiot", "R3", 38),
  makePlayer("King Radio", "R2", 30.5),
  makePlayer("Jal Menino", "R2", 25.7),
  makePlayer("ZMBISLAYER", "R2", 19),
  makePlayer("DTgreaterthanMS", "R2", 23.5),
  makePlayer("Scottg62", "R2", 33.2),
  makePlayer("Slvrbullets", "R3", 51.2),
  makePlayer("Aintnothing", "R3", 52.4),
  makePlayer("r4iDIJN", "R3", 51.5),
  makePlayer("K1ngpen", "R3", 0)
];

const taskForces = {
  taskForceA: {
    key: "taskForceA",
    label: "Task Force A",
    squads: [
      makeSquad("hospital", "Hospital Squad", [
        makeSlot("strategist", "Strategist", "Strategist", "Bottled In Bond"),
        makeSlot("full-1", "Full-time 1", "Full-time", "Jagb2011"),
        makeSlot("full-2", "Full-time 2", "Full-time", "Artorias of TheAbyss"),
        makeSlot("full-3", "Full-time 3", "Full-time", "WGCSFV"),
        makeSlot("flex-1", "Flex 1", "Flex", "Rotrotomeo"),
        makeSlot("flex-2", "Flex 2", "Flex", "Jleehank")
      ]),
      makeSquad("oil", "Oil Squad", [
        makeSlot("strategist", "Strategist", "Strategist", "xEibon"),
        makeSlot("full-1", "Full-time 1", "Full-time", "xxxxxxy5"),
        makeSlot("full-2", "Full-time 2", "Full-time", "Kor Pepper"),
        makeSlot("full-3", "Full-time 3", "Full-time", "브룩햄더슈")
      ]),
      makeSquad("science-info", "Science & Info Squad", [
        makeSlot("strategist", "Strategist", "Strategist", "Mr 3 point 75"),
        makeSlot("full-1", "Full-time 1", "Full-time", "Hippie Mike"),
        makeSlot("full-2", "Full-time 2", "Full-time", "Zombie Slayer 64"),
        makeSlot("full-3", "Full-time 3", "Full-time", "soldado006"),
        makeSlot("flex-1", "Flex 1", "Flex", "PleaseBeNice")
      ]),
      makeSquad("roaming", "Roaming Squad", [
        makeSlot("full-1", "Full-time 1", "Full-time", "King Kong SOS"),
        makeSlot("full-2", "Full-time 2", "Full-time", "Sebby5683"),
        makeSlot("full-3", "Full-time 3", "Full-time", "PlagusStein"),
        makeSlot("full-4", "Full-time 4", "Full-time", "DefenestranatorX"),
        makeSlot("full-5", "Full-time 5", "Full-time", "Perky Petunia")
      ]),
      makeSquad("substitutes", "Substitutes", [
        makeSlot("sub-1", "Sub 1", "Sub", "Cdub81"),
        makeSlot("sub-2", "Sub 2", "Sub", "Zapatista09"),
        makeSlot("sub-3", "Sub 3", "Sub", "Frainho"),
        makeSlot("sub-4", "Sub 4", "Sub", "파파로야"),
        makeSlot("sub-5", "Sub 5", "Sub", "Ruby PR"),
        makeSlot("sub-6", "Sub 6", "Sub", "Ace 664"),
        makeSlot("sub-7", "Sub 7", "Sub", "Auti111"),
        makeSlot("sub-8", "Sub 8", "Sub", "Magicplumb"),
        makeSlot("sub-9", "Sub 9", "Sub", "Veneciano II"),
        makeSlot("sub-10", "Sub 10", "Sub", "")
      ])
    ]
  },
  taskForceB: {
    key: "taskForceB",
    label: "Task Force B",
    squads: [
      makeSquad("hospital", "Hospital Squad", [
        makeSlot("strategist", "Strategist", "Strategist", "Scottg62"),
        makeSlot("full-1", "Full-time 1", "Full-time", "JuanManRiot"),
        makeSlot("full-2", "Full-time 2", "Full-time", "Patrick t"),
        makeSlot("full-3", "Full-time 3", "Full-time", "LtTally"),
        makeSlot("flex-1", "Flex 1", "Flex", "Great Obliterator"),
        makeSlot("flex-2", "Flex 2", "Flex", "r4iDIJN")
      ]),
      makeSquad("oil", "Oil Squad", [
        makeSlot("strategist", "Strategist", "Strategist", "MelaniaAaa"),
        makeSlot("full-1", "Full-time 1", "Full-time", "Budda254"),
        makeSlot("full-2", "Full-time 2", "Full-time", "IBEWsparky"),
        makeSlot("full-3", "Full-time 3", "Full-time", "kaymack")
      ]),
      makeSquad("science-info", "Science & Info Squad", [
        makeSlot("strategist", "Strategist", "Strategist", "WiseWordz"),
        makeSlot("full-1", "Full-time 1", "Full-time", "Asya Go"),
        makeSlot("full-2", "Full-time 2", "Full-time", "GravyOC"),
        makeSlot("full-3", "Full-time 3", "Full-time", "SilentKnight61"),
        makeSlot("flex-1", "Flex 1", "Flex", "Moon Beast")
      ]),
      makeSquad("roaming", "Roaming Squad", [
        makeSlot("full-1", "Full-time 1", "Full-time", "rsltid"),
        makeSlot("full-2", "Full-time 2", "Full-time", "Killin Zombs"),
        makeSlot("full-3", "Full-time 3", "Full-time", "Gotchakwik"),
        makeSlot("full-4", "Full-time 4", "Full-time", "Jeeb1971"),
        makeSlot("full-5", "Full-time 5", "Full-time", "SlipumDeadHead")
      ]),
      makeSquad("substitutes", "Substitutes", [
        makeSlot("sub-1", "Sub 1", "Sub", "Crolll"),
        makeSlot("sub-2", "Sub 2", "Sub", "Bedis1986"),
        makeSlot("sub-3", "Sub 3", "Sub", "BigMacFox"),
        makeSlot("sub-4", "Sub 4", "Sub", "Amerinda"),
        makeSlot("sub-5", "Sub 5", "Sub", "G R A N D A O  SOS"),
        makeSlot("sub-6", "Sub 6", "Sub", "DuhStroia"),
        makeSlot("sub-7", "Sub 7", "Sub", "Aintnothing"),
        makeSlot("sub-8", "Sub 8", "Sub", "Slvrbullets"),
        makeSlot("sub-9", "Sub 9", "Sub", "RangeCoach"),
        makeSlot("sub-10", "Sub 10", "Sub", "K1ngpen")
      ])
    ]
  }
};

Object.values(taskForces).forEach((taskForce) => {
  (taskForce.squads || []).forEach((squad) => {
    (squad.slots || []).forEach((slot) => {
      slot.playerName = "";
    });
  });
});

module.exports = {
  alliances: [
    {
      id: "alliance-pakx",
      name: "PAKX Alliance",
      code: "PAKX2023",
      players: players.filter((player) => player.name === "Cdub81"),
      taskForces
    }
  ],
  sessions: []
};
