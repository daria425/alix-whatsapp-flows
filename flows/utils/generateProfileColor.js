const generateProfileColor = () => {
  const colorHexValues = [
    "#8E71F9",
    "#66C6DB",
    "#FFC143",
    "#3BE589",
    "#DC665A",
    "#D855FA",
  ];
  return colorHexValues[Math.floor(Math.random() * colorHexValues.length)];
};

module.exports = { generateProfileColor };
