import { clampHqLevel, getHqRequirement } from "./hqRequirements";

const BUILDING_COSTS = {
  // Source: simplegameguide.com/last-war-headquarters-upgrade-requirements/
  Headquarters: {
    1:  { gold: "0",         iron: "0",           food: "0",           oil: "0" },
    2:  { gold: "0",         iron: "68",          food: "68",          oil: "0" },
    3:  { gold: "0",         iron: "1000",        food: "1000",        oil: "0" },
    4:  { gold: "0",         iron: "2500",        food: "2500",        oil: "0" },
    5:  { gold: "0",         iron: "20000",       food: "20000",       oil: "0" },
    6:  { gold: "0",         iron: "91000",       food: "91000",       oil: "0" },
    7:  { gold: "0",         iron: "240000",      food: "240000",      oil: "0" },
    8:  { gold: "0",         iron: "390000",      food: "390000",      oil: "0" },
    9:  { gold: "200000",    iron: "620000",      food: "620000",      oil: "0" },
    10: { gold: "240000",    iron: "750000",      food: "750000",      oil: "0" },
    11: { gold: "600000",    iron: "1900000",     food: "1900000",     oil: "0" },
    12: { gold: "1000000",   iron: "3200000",     food: "3200000",     oil: "0" },
    13: { gold: "1100000",   iron: "3500000",     food: "3500000",     oil: "0" },
    14: { gold: "1600000",   iron: "4900000",     food: "4900000",     oil: "0" },
    15: { gold: "2200000",   iron: "6800000",     food: "6800000",     oil: "0" },
    16: { gold: "3900000",   iron: "12000000",    food: "12000000",    oil: "0" },
    17: { gold: "5100000",   iron: "16000000",    food: "16000000",    oil: "0" },
    18: { gold: "8900000",   iron: "28000000",    food: "28000000",    oil: "0" },
    19: { gold: "11000000",  iron: "33000000",    food: "33000000",    oil: "0" },
    20: { gold: "19000000",  iron: "60000000",    food: "60000000",    oil: "0" },
    21: { gold: "27000000",  iron: "84000000",    food: "84000000",    oil: "0" },
    22: { gold: "35000000",  iron: "110000000",   food: "110000000",   oil: "0" },
    23: { gold: "44000000",  iron: "140000000",   food: "140000000",   oil: "0" },
    24: { gold: "54000000",  iron: "170000000",   food: "170000000",   oil: "0" },
    25: { gold: "93000000",  iron: "290000000",   food: "290000000",   oil: "0" },
    26: { gold: "130000000", iron: "400000000",   food: "400000000",   oil: "0" },
    27: { gold: "170000000", iron: "530000000",   food: "530000000",   oil: "0" },
    28: { gold: "240000000", iron: "740000000",   food: "740000000",   oil: "0" },
    29: { gold: "330000000", iron: "1000000000",  food: "1000000000",  oil: "0" },
    30: { gold: "460000000", iron: "1400000000",  food: "1400000000",  oil: "0" },
    31: { gold: "510000000", iron: "1600000000",  food: "1600000000",  oil: "1440000" },
    32: { gold: "560000000", iron: "1700000000",  food: "1700000000",  oil: "2300000" },
    33: { gold: "620000000", iron: "1900000000",  food: "1900000000",  oil: "3920000" },
    34: { gold: "650000000", iron: "2000000000",  food: "2000000000",  oil: "7050000" },
    35: { gold: "680000000", iron: "2100000000",  food: "2100000000",  oil: "14100000" }
  },
  // Source: unverified — data may be approximate
  "Tech Center": {
    2:  { gold: "0",         iron: "230",         food: "230",         oil: "0" },
    3:  { gold: "0",         iron: "1000",        food: "1000",        oil: "0" },
    4:  { gold: "0",         iron: "2500",        food: "2500",        oil: "0" },
    5:  { gold: "0",         iron: "20000",       food: "20000",       oil: "0" },
    6:  { gold: "0",         iron: "91000",       food: "91000",       oil: "0" },
    7:  { gold: "0",         iron: "210000",      food: "210000",      oil: "0" },
    8:  { gold: "0",         iron: "340000",      food: "340000",      oil: "0" },
    9:  { gold: "170000",    iron: "540000",      food: "540000",      oil: "0" },
    10: { gold: "210000",    iron: "650000",      food: "650000",      oil: "0" },
    11: { gold: "520000",    iron: "1600000",     food: "1600000",     oil: "0" },
    12: { gold: "890000",    iron: "2800000",     food: "2800000",     oil: "0" },
    13: { gold: "980000",    iron: "3100000",     food: "3100000",     oil: "0" },
    14: { gold: "1400000",   iron: "4300000",     food: "4300000",     oil: "0" },
    15: { gold: "1900000",   iron: "6000000",     food: "6000000",     oil: "0" },
    16: { gold: "3400000",   iron: "11000000",    food: "11000000",    oil: "0" },
    17: { gold: "4400000",   iron: "14000000",    food: "14000000",    oil: "0" },
    18: { gold: "7800000",   iron: "24000000",    food: "24000000",    oil: "0" },
    19: { gold: "9300000",   iron: "29000000",    food: "29000000",    oil: "0" },
    20: { gold: "17000000",  iron: "52000000",    food: "52000000",    oil: "0" },
    21: { gold: "23000000",  iron: "73000000",    food: "73000000",    oil: "0" },
    22: { gold: "30000000",  iron: "95000000",    food: "95000000",    oil: "0" },
    23: { gold: "38000000",  iron: "120000000",   food: "120000000",   oil: "0" },
    24: { gold: "48000000",  iron: "150000000",   food: "150000000",   oil: "0" },
    25: { gold: "81000000",  iron: "250000000",   food: "250000000",   oil: "0" },
    26: { gold: "110000000", iron: "350000000",   food: "350000000",   oil: "0" },
    27: { gold: "150000000", iron: "460000000",   food: "460000000",   oil: "0" },
    28: { gold: "210000000", iron: "640000000",   food: "640000000",   oil: "0" },
    29: { gold: "290000000", iron: "900000000",   food: "900000000",   oil: "0" },
    30: { gold: "400000000", iron: "1300000000",  food: "1300000000",  oil: "0" },
    31: { gold: "440000000", iron: "1400000000",  food: "1400000000",  oil: "810000" },
    32: { gold: "490000000", iron: "1500000000",  food: "1500000000",  oil: "1300000" },
    33: { gold: "540000000", iron: "1700000000",  food: "1700000000",  oil: "2200000" },
    34: { gold: "570000000", iron: "1800000000",  food: "1800000000",  oil: "3970000" },
    35: { gold: "590000000", iron: "1900000000",  food: "1900000000",  oil: "7930000" }
  },
  // Source: simplegameguide.com/last-war-barracks-upgrade-requirements/ (levels 2–30); levels 31–34 unverified
  Barracks: {
    2:  { gold: "0",         iron: "30",          food: "30",          oil: "0" },
    3:  { gold: "0",         iron: "680",         food: "680",         oil: "0" },
    4:  { gold: "0",         iron: "1700",        food: "1700",        oil: "0" },
    5:  { gold: "0",         iron: "14000",       food: "14000",       oil: "0" },
    6:  { gold: "0",         iron: "61000",       food: "61000",       oil: "0" },
    7:  { gold: "0",         iron: "120000",      food: "120000",      oil: "0" },
    8:  { gold: "0",         iron: "190000",      food: "190000",      oil: "0" },
    9:  { gold: "120000",    iron: "310000",      food: "310000",      oil: "0" },
    10: { gold: "150000",    iron: "370000",      food: "370000",      oil: "0" },
    11: { gold: "370000",    iron: "930000",      food: "930000",      oil: "0" },
    12: { gold: "630000",    iron: "1600000",     food: "1600000",     oil: "0" },
    13: { gold: "700000",    iron: "1700000",     food: "1700000",     oil: "0" },
    14: { gold: "980000",    iron: "2400000",     food: "2400000",     oil: "0" },
    15: { gold: "1300000",   iron: "3200000",     food: "3200000",     oil: "0" },
    16: { gold: "2200000",   iron: "5700000",     food: "5700000",     oil: "0" },
    17: { gold: "3100000",   iron: "7800000",     food: "7800000",     oil: "0" },
    18: { gold: "5200000",   iron: "13300000",    food: "13300000",    oil: "0" },
    19: { gold: "6600000",   iron: "17000000",    food: "17000000",    oil: "0" },
    20: { gold: "12000000",  iron: "30000000",    food: "30000000",    oil: "0" },
    21: { gold: "17000000",  iron: "42000000",    food: "42000000",    oil: "0" },
    22: { gold: "22000000",  iron: "54000000",    food: "54000000",    oil: "0" },
    23: { gold: "27000000",  iron: "68000000",    food: "68000000",    oil: "0" },
    24: { gold: "34000000",  iron: "85000000",    food: "85000000",    oil: "0" },
    25: { gold: "58000000",  iron: "140000000",   food: "140000000",   oil: "0" },
    26: { gold: "81000000",  iron: "200000000",   food: "200000000",   oil: "0" },
    27: { gold: "110000000", iron: "260000000",   food: "260000000",   oil: "0" },
    28: { gold: "150000000", iron: "370000000",   food: "370000000",   oil: "0" },
    29: { gold: "210000000", iron: "520000000",   food: "520000000",   oil: "0" },
    30: { gold: "290000000", iron: "720000000",   food: "720000000",   oil: "0" },
    31: { gold: "320000000", iron: "790000000",   food: "790000000",   oil: "360000" },
    32: { gold: "350000000", iron: "870000000",   food: "870000000",   oil: "576000" },
    33: { gold: "380000000", iron: "960000000",   food: "960000000",   oil: "979200" },
    34: { gold: "400000000", iron: "1000000000",  food: "1000000000",  oil: "1760000" },
    35: { gold: "420000000", iron: "1100000000",  food: "1100000000",  oil: "3530000" }
  },
  // Source: unverified — data may be approximate
  "Drill Ground": {
    1:  { gold: "0",         iron: "20",          food: "60",          oil: "0" },
    2:  { gold: "0",         iron: "15",          food: "45",          oil: "0" },
    3:  { gold: "0",         iron: "340",         food: "1000",        oil: "0" },
    4:  { gold: "0",         iron: "840",         food: "2500",        oil: "0" },
    5:  { gold: "0",         iron: "6800",        food: "20000",       oil: "0" },
    6:  { gold: "0",         iron: "20000",       food: "61000",       oil: "0" },
    7:  { gold: "0",         iron: "41000",       food: "120000",      oil: "0" },
    8:  { gold: "0",         iron: "65000",       food: "190000",      oil: "0" },
    9:  { gold: "83000",     iron: "100000",      food: "310000",      oil: "0" },
    10: { gold: "100000",    iron: "120000",      food: "370000",      oil: "0" },
    11: { gold: "250000",    iron: "310000",      food: "930000",      oil: "0" },
    12: { gold: "420000",    iron: "530000",      food: "1600000",     oil: "0" },
    13: { gold: "470000",    iron: "580000",      food: "1700000",     oil: "0" },
    14: { gold: "650000",    iron: "810000",      food: "2400000",     oil: "0" },
    15: { gold: "910000",    iron: "1100000",     food: "3400000",     oil: "0" },
    16: { gold: "1600000",   iron: "2000000",     food: "6100000",     oil: "0" },
    17: { gold: "2100000",   iron: "2600000",     food: "7900000",     oil: "0" },
    18: { gold: "3700000",   iron: "4600000",     food: "14000000",    oil: "0" },
    19: { gold: "4400000",   iron: "5500000",     food: "17000000",    oil: "0" },
    20: { gold: "8000000",   iron: "10000000",    food: "30000000",    oil: "0" },
    21: { gold: "11000000",  iron: "14000000",    food: "42000000",    oil: "0" },
    22: { gold: "15000000",  iron: "18000000",    food: "54000000",    oil: "0" },
    23: { gold: "18000000",  iron: "23000000",    food: "68000000",    oil: "0" },
    24: { gold: "23000000",  iron: "28000000",    food: "85000000",    oil: "0" },
    25: { gold: "39000000",  iron: "48000000",    food: "140000000",   oil: "0" },
    26: { gold: "54000000",  iron: "67000000",    food: "200000000",   oil: "0" },
    27: { gold: "70000000",  iron: "88000000",    food: "260000000",   oil: "0" },
    28: { gold: "98000000",  iron: "120000000",   food: "370000000",   oil: "0" },
    29: { gold: "140000000", iron: "170000000",   food: "520000000",   oil: "0" },
    30: { gold: "190000000", iron: "240000000",   food: "720000000",   oil: "0" },
    32: { gold: "230000000", iron: "290000000",   food: "870000000",   oil: "432000" },
    34: { gold: "270000000", iron: "340000000",   food: "1000000000",  oil: "1320000" }
  },
  // Source: unverified — data may be approximate
  Hospital: {
    2:  { gold: "0",         iron: "75",          food: "230",         oil: "0" },
    3:  { gold: "0",         iron: "340",         food: "1000",        oil: "0" },
    4:  { gold: "0",         iron: "840",         food: "2500",        oil: "0" },
    5:  { gold: "0",         iron: "6800",        food: "20000",       oil: "0" },
    6:  { gold: "0",         iron: "30000",       food: "91000",       oil: "0" },
    7:  { gold: "0",         iron: "61000",       food: "180000",      oil: "0" },
    8:  { gold: "0",         iron: "97000",       food: "290000",      oil: "0" },
    9:  { gold: "120000",    iron: "160000",      food: "470000",      oil: "0" },
    10: { gold: "150000",    iron: "190000",      food: "560000",      oil: "0" },
    11: { gold: "370000",    iron: "470000",      food: "1400000",     oil: "0" },
    12: { gold: "630000",    iron: "790000",      food: "2400000",     oil: "0" },
    13: { gold: "700000",    iron: "870000",      food: "2600000",     oil: "0" },
    14: { gold: "980000",    iron: "1200000",     food: "3700000",     oil: "0" },
    15: { gold: "1400000",   iron: "1700000",     food: "5100000",     oil: "0" },
    16: { gold: "2400000",   iron: "3000000",     food: "9100000",     oil: "0" },
    17: { gold: "3200000",   iron: "4000000",     food: "12000000",    oil: "0" },
    18: { gold: "5500000",   iron: "6900000",     food: "21000000",    oil: "0" },
    19: { gold: "6600000",   iron: "8300000",     food: "25000000",    oil: "0" },
    20: { gold: "12000000",  iron: "15000000",    food: "45000000",    oil: "0" },
    21: { gold: "17000000",  iron: "21000000",    food: "63000000",    oil: "0" },
    22: { gold: "22000000",  iron: "27000000",    food: "82000000",    oil: "0" },
    23: { gold: "27000000",  iron: "34000000",    food: "100000000",   oil: "0" },
    24: { gold: "34000000",  iron: "43000000",    food: "130000000",   oil: "0" },
    25: { gold: "58000000",  iron: "72000000",    food: "220000000",   oil: "0" },
    26: { gold: "81000000",  iron: "100000000",   food: "300000000",   oil: "0" },
    27: { gold: "110000000", iron: "130000000",   food: "390000000",   oil: "0" },
    28: { gold: "150000000", iron: "180000000",   food: "550000000",   oil: "0" },
    29: { gold: "210000000", iron: "260000000",   food: "770000000",   oil: "0" },
    30: { gold: "290000000", iron: "360000000",   food: "1100000000",  oil: "0" },
    31: { gold: "320000000", iron: "400000000",   food: "1200000000",  oil: "270000" },
    32: { gold: "350000000", iron: "440000000",   food: "1300000000",  oil: "432000" },
    33: { gold: "380000000", iron: "480000000",   food: "1400000000",  oil: "734400" },
    34: { gold: "400000000", iron: "500000000",   food: "1500000000",  oil: "1320000" },
    35: { gold: "420000000", iron: "530000000",   food: "1600000000",  oil: "2640000" }
  },
  // Source: simplegameguide.com/last-war-wall-upgrade-requirement/
  Wall: {
    2:  { gold: "0",         iron: "68",          food: "23",          oil: "0" },
    3:  { gold: "0",         iron: "1000",        food: "340",         oil: "0" },
    4:  { gold: "0",         iron: "2500",        food: "840",         oil: "0" },
    5:  { gold: "0",         iron: "20000",       food: "6800",        oil: "0" },
    6:  { gold: "0",         iron: "91000",       food: "30000",       oil: "0" },
    7:  { gold: "0",         iron: "240000",      food: "81000",       oil: "0" },
    8:  { gold: "0",         iron: "390000",      food: "130000",      oil: "0" },
    9:  { gold: "130000",    iron: "620000",      food: "210000",      oil: "0" },
    10: { gold: "160000",    iron: "750000",      food: "250000",      oil: "0" },
    11: { gold: "400000",    iron: "1900000",     food: "620000",      oil: "0" },
    12: { gold: "680000",    iron: "3200000",     food: "1100000",     oil: "0" },
    13: { gold: "740000",    iron: "3500000",     food: "1200000",     oil: "0" },
    14: { gold: "1000000",   iron: "4900000",     food: "1600000",     oil: "0" },
    15: { gold: "1500000",   iron: "6800000",     food: "2300000",     oil: "0" },
    16: { gold: "2600000",   iron: "12000000",    food: "4100000",     oil: "0" },
    17: { gold: "3400000",   iron: "16000000",    food: "5300000",     oil: "0" },
    18: { gold: "5900000",   iron: "28000000",    food: "9200000",     oil: "0" },
    19: { gold: "7100000",   iron: "33000000",    food: "11000000",    oil: "0" },
    20: { gold: "13000000",  iron: "60000000",    food: "20000000",    oil: "0" },
    21: { gold: "18000000",  iron: "84000000",    food: "28000000",    oil: "0" },
    22: { gold: "23000000",  iron: "110000000",   food: "36000000",    oil: "0" },
    23: { gold: "29000000",  iron: "140000000",   food: "45000000",    oil: "0" },
    24: { gold: "36000000",  iron: "170000000",   food: "57000000",    oil: "0" },
    25: { gold: "62000000",  iron: "290000000",   food: "96000000",    oil: "0" },
    26: { gold: "86000000",  iron: "400000000",   food: "130000000",   oil: "0" },
    27: { gold: "110000000", iron: "530000000",   food: "180000000",   oil: "0" },
    28: { gold: "160000000", iron: "740000000",   food: "250000000",   oil: "0" },
    29: { gold: "220000000", iron: "1000000000",  food: "340000000",   oil: "0" },
    30: { gold: "310000000", iron: "1400000000",  food: "480000000",   oil: "0" },
    31: { gold: "340000000", iron: "1600000000",  food: "530000000",   oil: "675000" },
    32: { gold: "370000000", iron: "1700000000",  food: "580000000",   oil: "1080000" },
    33: { gold: "410000000", iron: "1900000000",  food: "640000000",   oil: "1840000" },
    34: { gold: "430000000", iron: "2000000000",  food: "670000000",   oil: "3300000" },
    35: { gold: "450000000", iron: "2100000000",  food: "710000000",   oil: "6610000" }
  },
  // Source: unverified — data may be approximate
  "Alliance Center": {
    2:  { gold: "0",         iron: "75",          food: "230",         oil: "0" },
    3:  { gold: "0",         iron: "340",         food: "1000",        oil: "0" },
    4:  { gold: "0",         iron: "840",         food: "2500",        oil: "0" },
    5:  { gold: "0",         iron: "6800",        food: "20000",       oil: "0" },
    6:  { gold: "0",         iron: "20000",       food: "61000",       oil: "0" },
    7:  { gold: "0",         iron: "41000",       food: "120000",      oil: "0" },
    8:  { gold: "0",         iron: "65000",       food: "190000",      oil: "0" },
    9:  { gold: "100000",    iron: "100000",      food: "310000",      oil: "0" },
    10: { gold: "120000",    iron: "120000",      food: "370000",      oil: "0" },
    11: { gold: "300000",    iron: "310000",      food: "930000",      oil: "0" },
    12: { gold: "510000",    iron: "530000",      food: "1600000",     oil: "0" },
    13: { gold: "560000",    iron: "580000",      food: "1700000",     oil: "0" },
    14: { gold: "780000",    iron: "810000",      food: "2400000",     oil: "0" },
    15: { gold: "1100000",   iron: "1100000",     food: "3400000",     oil: "0" },
    16: { gold: "1900000",   iron: "2000000",     food: "6100000",     oil: "0" },
    17: { gold: "2500000",   iron: "2600000",     food: "7900000",     oil: "0" },
    18: { gold: "4400000",   iron: "4600000",     food: "14000000",    oil: "0" },
    19: { gold: "5300000",   iron: "5500000",     food: "17000000",    oil: "0" },
    20: { gold: "9600000",   iron: "10000000",    food: "30000000",    oil: "0" },
    21: { gold: "13000000",  iron: "14000000",    food: "42000000",    oil: "0" },
    22: { gold: "17000000",  iron: "18000000",    food: "54000000",    oil: "0" },
    23: { gold: "22000000",  iron: "23000000",    food: "68000000",    oil: "0" },
    24: { gold: "27000000",  iron: "28000000",    food: "85000000",    oil: "0" },
    25: { gold: "46000000",  iron: "48000000",    food: "140000000",   oil: "0" },
    26: { gold: "65000000",  iron: "67000000",    food: "200000000",   oil: "0" },
    27: { gold: "84000000",  iron: "88000000",    food: "260000000",   oil: "0" },
    28: { gold: "120000000", iron: "120000000",   food: "370000000",   oil: "0" },
    29: { gold: "170000000", iron: "170000000",   food: "520000000",   oil: "0" },
    30: { gold: "230000000", iron: "240000000",   food: "720000000",   oil: "0" },
    31: { gold: "250000000", iron: "260000000",   food: "790000000",   oil: "202500" },
    32: { gold: "280000000", iron: "290000000",   food: "870000000",   oil: "324000" },
    33: { gold: "310000000", iron: "320000000",   food: "960000000",   oil: "550800" },
    34: { gold: "320000000", iron: "340000000",   food: "1000000000",  oil: "991440" },
    35: { gold: "340000000", iron: "350000000",   food: "1100000000",  oil: "1980000" }
  },
  // Source: simplegameguide.com/last-war-tank-center-upgrade-cost/ (levels 1–32); levels 33–34 unverified
  "Tank/Air/Missile Center": {
    2:  { gold: "0",         iron: "230",         food: "75",          oil: "0" },
    3:  { gold: "0",         iron: "1000",        food: "340",         oil: "0" },
    4:  { gold: "0",         iron: "2500",        food: "840",         oil: "0" },
    5:  { gold: "0",         iron: "30000",       food: "10000",       oil: "0" },
    6:  { gold: "0",         iron: "91000",       food: "30000",       oil: "0" },
    7:  { gold: "0",         iron: "180000",      food: "61000",       oil: "0" },
    8:  { gold: "0",         iron: "290000",      food: "97000",       oil: "0" },
    9:  { gold: "100000",    iron: "470000",      food: "160000",      oil: "0" },
    10: { gold: "120000",    iron: "560000",      food: "190000",      oil: "0" },
    11: { gold: "300000",    iron: "1400000",     food: "470000",      oil: "0" },
    12: { gold: "510000",    iron: "2400000",     food: "790000",      oil: "0" },
    13: { gold: "560000",    iron: "2600000",     food: "870000",      oil: "0" },
    14: { gold: "780000",    iron: "3700000",     food: "1200000",     oil: "0" },
    15: { gold: "1100000",   iron: "5100000",     food: "1700000",     oil: "0" },
    16: { gold: "1900000",   iron: "9100000",     food: "3000000",     oil: "0" },
    17: { gold: "2500000",   iron: "12000000",    food: "4000000",     oil: "0" },
    18: { gold: "4400000",   iron: "21000000",    food: "6900000",     oil: "0" },
    19: { gold: "5300000",   iron: "25000000",    food: "8300000",     oil: "0" },
    20: { gold: "9600000",   iron: "45000000",    food: "15000000",    oil: "0" },
    21: { gold: "13000000",  iron: "63000000",    food: "21000000",    oil: "0" },
    22: { gold: "17000000",  iron: "82000000",    food: "27000000",    oil: "0" },
    23: { gold: "22000000",  iron: "100000000",   food: "34000000",    oil: "0" },
    24: { gold: "27000000",  iron: "130000000",   food: "43000000",    oil: "0" },
    25: { gold: "46000000",  iron: "220000000",   food: "72000000",    oil: "0" },
    26: { gold: "65000000",  iron: "300000000",   food: "100000000",   oil: "0" },
    27: { gold: "84000000",  iron: "390000000",   food: "130000000",   oil: "0" },
    28: { gold: "120000000", iron: "550000000",   food: "180000000",   oil: "0" },
    29: { gold: "170000000", iron: "770000000",   food: "260000000",   oil: "0" },
    30: { gold: "230000000", iron: "1100000000",  food: "360000000",   oil: "0" },
    31: { gold: "250000000", iron: "1200000000",  food: "400000000",   oil: "562500" },
    32: { gold: "280000000", iron: "1300000000",  food: "440000000",   oil: "900000" },
    33: { gold: "310000000", iron: "1400000000",  food: "480000000",   oil: "1530000" },
    34: { gold: "320000000", iron: "1500000000",  food: "500000000",   oil: "2750000" },
    35: { gold: "340000000", iron: "1600000000",  food: "530000000",   oil: "5510000" }
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

const BUILDING_NAME_ALIASES = {
  "Tank or Air or Missile Center": "Tank/Air/Missile Center",
  "Troop Center": "Tank/Air/Missile Center"
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

function normalizeBuildingName(building) {
  const trimmed = String(building || "").trim();
  return BUILDING_NAME_ALIASES[trimmed] || trimmed;
}

function getDisplayBuildingName(building) {
  const normalizedBuilding = normalizeBuildingName(building);
  return DISPLAY_BUILDING_NAMES[normalizedBuilding] || normalizedBuilding;
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
  const normalizedBuilding = normalizeBuildingName(building);
  const costEntry = BUILDING_COSTS[normalizedBuilding]?.[targetLevel];
  const fromLevel = Math.max(0, targetLevel - 1);
  const label = options.displayLabel || getDisplayBuildingName(normalizedBuilding);

  if (isUnavailableCostEntry(costEntry)) {
    return {
      key: `${normalizedBuilding}-${targetLevel}`,
      building: normalizedBuilding,
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
    key: `${normalizedBuilding}-${targetLevel}`,
    building: normalizedBuilding,
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
  return Object.entries(BUILDING_COSTS[normalizeBuildingName(building)] || {})
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
    ...requirement.requirements.map((item) => {
      const normalizedBuilding = normalizeBuildingName(item.costBuilding || item.building);
      return buildUpgradeEntry(normalizedBuilding, item.requiredLevel, reductionPercent, {
        optionalChoice: normalizedBuilding === "Tank/Air/Missile Center",
        displayLabel: getDisplayBuildingName(normalizedBuilding),
        source: "hq"
      });
    })
  ];
}

function normalizeBuildingSelection(selection) {
  const building = normalizeBuildingName(selection?.building || getBuildingOptions()[0]?.value || "Tech Center");
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
