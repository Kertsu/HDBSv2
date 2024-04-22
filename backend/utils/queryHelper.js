const queryHelper = async (model, userQuery, type) => {
  const { filters, first, rows, sortField, sortOrder, area, mode } = userQuery;

  let query = model.find();

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
        case "dateBefore":
          if (value.value) {
            andConditions.push({
              [key]: { $lt: new Date(value.value) },
            });
          }
          break;
        case "dateAfter":
          if (value.value) {
            andConditions.push({
              [key]: { $gt: new Date(value.value) },
            });
          }
          break;
        case "dateIsNot":
          if (value.value) {
            andConditions.push({
              [key]: { $ne: new Date(value.value) },
            });
          }
          break;
        case "dateIs":
          if (value.value) {
            andConditions.push({
              [key]: new Date(value.value),
            });
          }
          break;
      }

      if (key === "isDisabled" && value.value === 0) {
        andConditions.push({ isDisabled: 0 });
      }
    }

    if (andConditions.length > 0) {
      query = query.and(andConditions);
    }
  } else if (mode && type == "reservation") {
    query = query.find({ mode });
  }

  if (area){
    query = query.find({ area });
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
