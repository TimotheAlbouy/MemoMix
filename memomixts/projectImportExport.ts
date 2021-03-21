interface GroupSizesObject {
    [key: string]: number;
}

interface EntryObject {
    [key: string]: string[];
}

interface ConstraintObject {
    personIds: string[];
    inGroup?: string;
    notInGroups?: string[]
}

function importPersonIds(personIdsArray: string[]) {
    return new Set(personIdsArray);
}

function importGroupSizes(groupSizesObject: GroupSizesObject) {
    let groupSizes = new Map<string, number>();
    for (let groupId in groupSizesObject)
        groupSizes.set(groupId, groupSizesObject[groupId]);
    return groupSizes;
}

function importHistory(historyArray: EntryObject[]) {
    let history: Entry[] = [];
    for (let entryObject of historyArray)
        history.push(importEntry(entryObject));
    return history;
}

function importEntry(entryObject: EntryObject) {
    let entry = new Map<string, Set<string>>();
    for (let groupId in entryObject)
        entry.set(groupId, new Set(entryObject[groupId]));
    return entry;
}

function importConstraints(constraintsArray: ConstraintObject[]) {
    let constraints: Constraint[] = [];
    for (let constraintObject of constraintsArray) {
        let constraint: Constraint = {
            personIds: new Set(constraintObject.personIds)
        };
        if (constraintObject.hasOwnProperty('inGroup'))
            constraint.inGroup = constraintObject.inGroup;
        if (constraintObject.hasOwnProperty('notInGroups'))
            constraint.notInGroups = new Set(constraintObject.notInGroups);
        constraints.push(constraint);
    }
    return constraints;
}

function exportPersonIds(personIds: Set<string>) {
    return Array.from(personIds);
}

function exportGroupSizes(groupSizes: Map<string, number>) {
    let groupSizesObject: GroupSizesObject = {};
    for (let [groupId, size] of groupSizes)
        groupSizesObject[groupId] = size;
    return groupSizesObject;
}

function exportHistory(history: Entry[]) {
    let historyArray: EntryObject[] = [];
    for (let entry of history)
        historyArray.push(exportEntry(entry));
    return historyArray;
}

function exportEntry(entry: Entry) {
    let entryObject: EntryObject = {};
    for (let [groupId, group] of entry)
        entryObject[groupId] = Array.from(group);
    return entryObject;
}

function exportConstraints(constraintsArray: ConstraintObject[]) {
    let constraints: Constraint[] = [];
    for (let constraintObject of constraintsArray) {
        let constraint: Constraint = {
            personIds: new Set(constraintObject.personIds)
        };
        if (constraintObject.hasOwnProperty('inGroup'))
            constraint.inGroup = constraintObject.inGroup;
        if (constraintObject.hasOwnProperty('notInGroups'))
            constraint.notInGroups = new Set(constraintObject.notInGroups);
        constraints.push(constraint);
    }
    return constraints;
}