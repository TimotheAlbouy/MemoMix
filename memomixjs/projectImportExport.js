export function importPersonIds(personIdsArray) {
    return new Set(personIdsArray);
}
export function importGroupSizes(groupSizesObject) {
    let groupSizes = new Map();
    for (let groupId in groupSizesObject)
        groupSizes.set(groupId, groupSizesObject[groupId]);
    return groupSizes;
}
export function importHistory(historyArray) {
    let history = [];
    for (let entryObject of historyArray)
        history.push(importEntry(entryObject));
    return history;
}
export function importEntry(entryObject) {
    let entry = new Map();
    for (let groupId in entryObject)
        entry.set(groupId, new Set(entryObject[groupId]));
    return entry;
}
export function importConstraints(constraintObjectsArray) {
    let constraints = [];
    for (let constraintObject of constraintObjectsArray) {
        let constraint = {
            type: constraintObject.type,
            personIds: new Set(constraintObject.personIds)
        };
        if (constraintObject.hasOwnProperty('mandatoryGroup'))
            constraint.mandatoryGroup = constraintObject.mandatoryGroup;
        if (constraintObject.hasOwnProperty('forbiddenGroups'))
            constraint.forbiddenGroups = new Set(constraintObject.forbiddenGroups);
        constraints.push(constraint);
    }
    return constraints;
}
export function exportPersonIds(personIds) {
    return Array.from(personIds);
}
export function exportGroupSizes(groupSizes) {
    let groupSizesObject = {};
    for (let [groupId, size] of groupSizes)
        groupSizesObject[groupId] = size;
    return groupSizesObject;
}
export function exportHistory(history) {
    let historyArray = [];
    for (let entry of history)
        historyArray.push(exportEntry(entry));
    return historyArray;
}
export function exportEntry(entry) {
    let entryObject = {};
    for (let [groupId, group] of entry)
        entryObject[groupId] = Array.from(group);
    return entryObject;
}
export function exportConstraints(constraints) {
    let constraintObjectsArray = [];
    for (let constraint of constraints) {
        let constraintObject = {
            type: constraint.type,
            personIds: Array.from(constraint.personIds)
        };
        if (constraint.hasOwnProperty('mandatoryGroup'))
            constraintObject.mandatoryGroup = constraintObject.mandatoryGroup;
        if (constraint.hasOwnProperty('forbiddenGroups'))
            constraintObject.forbiddenGroups = Array.from(constraintObject.forbiddenGroups);
        constraintObjectsArray.push(constraint);
    }
    return constraintObjectsArray;
}
//# sourceMappingURL=projectImportExport.js.map