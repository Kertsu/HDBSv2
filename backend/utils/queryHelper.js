const queryHelper = async (model, userQuery, type) => {
  const { filters, first, rows, sortField, sortOrder, area, mode } = userQuery;

  let query = model.find();

  console.log(filters);

  if (filters && type === "user") {
    const parsedFilters = JSON.parse(filters);
    const andConditions = [];

    for (const [key, value] of Object.entries(parsedFilters)) {
      switch (value.matchMode) {
        case "contains":
          if (value.value) {
            andConditions.push({
              [key]: { $regex: new RegExp(value.value, "i") },
            });
          }
          break;
        case "startsWith":
          if (value.value) {
            andConditions.push({
              [key]: { $regex: new RegExp("^" + value.value, "i") },
            });
          }
          break;
        case "endsWith":
          if (value.value) {
            andConditions.push({
              [key]: { $regex: new RegExp(value.value + "$", "i") },
            });
          }
          break;
        case "equals":
          if (value.value) {
            andConditions.push({ [key]: value.value });
          }
          break;
        case "notContains":
          if (value.value) {
            andConditions.push({
              [key]: { $not: { $regex: new RegExp(value.value, "i") } },
            });
          }
          break;
        case "contains":
          if (value.value) {
            andConditions.push({
              [key]: { $regex: new RegExp(`.*${value.value}.*`, "i") },
            });
          }
          break;
        // Add cases for other match modes if needed
      }
    }

    console.log(andConditions, "ln60");

    if (andConditions.length > 0) {
      query = query.and(andConditions);
    }
  } else if (filters && type == "hotdesk") {
    for (const [key, value] of Object.entries(JSON.parse(filters))) {
      console.log(typeof value.value);
      if (value.value && value.matchMode === "contains") {
        query = query.or([
          { deskNumber: { $regex: new RegExp(value.value, "i") } },
        ]);
      } else if (value.value && value.matchMode === "equals") {
        query = query.or([{ deskNumber: parseInt(value.value) }]);
      }
    }
  } else if (mode && type == "reservation") {
    query = query.find({ mode });
  }

  if (first !== undefined && rows !== undefined) {
    query = query.skip(parseInt(first)).limit(parseInt(rows));
  }

  if (sortField && sortOrder) {
    const sortParams = {};
    sortParams[sortField] = parseInt(sortOrder);
    query = query.sort(sortParams);
  }

  const result = await query.exec();

  const formattedResult = result.map((doc) => {
    return { id: doc.id, ...doc._doc };
  });

  return formattedResult;
};

module.exports = queryHelper;
