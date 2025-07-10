type MatchCriteria = { key: string; value: any };

const findMultipleByKeyValues = (
  obj: any,
  criteria: MatchCriteria[]
): Record<string, any[]> => {
  const found: Record<string, any[]> = {};

  const traverse = (node: any) => {
    if (typeof node !== "object" || node === null) return;

    for (const { key, value } of criteria) {
      if (node[key] === value) {
        const id = `${key}:${value}`;

        if (!found[id]) {
          found[id] = [];
        }

        found[id].push(node);
      }
    }

    for (const prop in node) {
      if (node.hasOwnProperty(prop)) {
        traverse(node[prop]);
      }
    }
  };

  traverse(obj);
  return found;
};

export default findMultipleByKeyValues;
