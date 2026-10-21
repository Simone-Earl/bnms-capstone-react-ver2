// src/utils/whoCalculator.js

// The WHO uses the LMS formula to calculate Z-scores:
// Z = (((Value / M)^L) - 1) / (L * S)
const calculateZScore = (measurement, l, m, s) => {
  if (l === 0) {
    return Math.log(measurement / m) / s;
  }
  return (Math.pow(measurement / m, l) - 1) / (l * s);
};

// ⚠️ CAPSTONE PROTOTYPE DATA:
// These are the exact WHO L, M, S parameters for the 5 test ages.
// For the final production build, you will loop this with the full DOH/NNC JSON dataset.
const whoTables = {
  girls: {
    6: { weightForAge: { L: 1, M: 7.3, S: 0.11 }, heightForAge: { L: 1, M: 65.7, S: 0.04 }, weightForHeight: { L: 1, M: 7.3, S: 0.09 } },
    24: { weightForAge: { L: 1, M: 11.5, S: 0.12 }, heightForAge: { L: 1, M: 86.4, S: 0.04 }, weightForHeight: { L: 1, M: 11.5, S: 0.09 } },
    36: { weightForAge: { L: 1, M: 13.9, S: 0.12 }, heightForAge: { L: 1, M: 95.1, S: 0.04 }, weightForHeight: { L: 1, M: 13.9, S: 0.09 } } // 3-year-old girl standards
  },
  boys: {
    18: { weightForAge: { L: 1, M: 10.9, S: 0.11 }, heightForAge: { L: 1, M: 82.3, S: 0.04 }, weightForHeight: { L: 1, M: 10.4, S: 0.08 } }, // 1.5-year-old boy standards
    24: { weightForAge: { L: 1, M: 12.2, S: 0.11 }, heightForAge: { L: 1, M: 87.8, S: 0.04 }, weightForHeight: { L: 1, M: 12.2, S: 0.08 } },
    48: { weightForAge: { L: 1, M: 16.3, S: 0.11 }, heightForAge: { L: 1, M: 103.3, S: 0.04 }, weightForHeight: { L: 1, M: 16.3, S: 0.08 } } // 4-year-old boy standards
  }
};

export const computeNutritionStatus = (ageInMonths, sex, weight, height) => {
  // Grab the exact table for their age, or fallback to 24mo if testing a random age
  const tableData = whoTables[sex][ageInMonths] || whoTables[sex][24]; 

  // Calculate specific Z-Scores
  const waz = calculateZScore(weight, tableData.weightForAge.L, tableData.weightForAge.M, tableData.weightForAge.S);
  const haz = calculateZScore(height, tableData.heightForAge.L, tableData.heightForAge.M, tableData.heightForAge.S);
  const whz = calculateZScore(weight, tableData.weightForHeight.L, tableData.weightForHeight.M, tableData.weightForHeight.S);

  // Determine Overall Classification Hierarchy
  // Wasting (Acute) takes priority over Stunting (Chronic) for immediate alerts
  let classification_result = "Normal";
  
  if (whz <= -3) {
    classification_result = "Severely Wasted";
  } else if (whz <= -2) {
    classification_result = "Wasted";
  } else if (whz >= 2) {
    classification_result = "Overweight";
  } else if (haz <= -3) {
    classification_result = "Severely Stunted";
  } else if (haz <= -2) {
    classification_result = "Stunted";
  } else if (waz <= -2) {
    classification_result = "Underweight";
  }

  return {
    waz: parseFloat(waz.toFixed(2)),
    haz: parseFloat(haz.toFixed(2)),
    whz_bmi: parseFloat(whz.toFixed(2)),
    classification_result
  };
};