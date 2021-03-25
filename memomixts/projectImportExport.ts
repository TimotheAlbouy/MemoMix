import { Entry, Constraint } from 'util.js';

export interface GroupSizesObject {
    [key: string]: number;
}

export interface EntryObject {
    [key: string]: string[];
}

export interface ConstraintObject {
    type: string,
    persons: string[];
    mandatoryGroup?: string;
    forbiddenGroups?: string[]
}

export function importPersons(personsArray: string[]) {
    return new Set(personsArray);
}

export function importGroupSizes(groupSizesObject: GroupSizesObject) {
    let groupSizes = new Map<string, number>();
    for (let groupId in groupSizesObject)
        groupSizes.set(groupId, groupSizesObject[groupId]);
    return groupSizes;
}

export function importHistory(historyArray: EntryObject[]) {
    let history: Entry[] = [];
    for (let entryObject of historyArray)
        history.push(importEntry(entryObject));
    return history;
}

export function importEntry(entryObject: EntryObject) {
    let entry = new Map<string, Set<string>>();
    for (let groupId in entryObject)
        entry.set(groupId, new Set(entryObject[groupId]));
    return entry;
}

export function importConstraints(constraintObjectsArray: ConstraintObject[]) {
    let constraints: Constraint[] = [];
    for (let constraintObject of constraintObjectsArray) {
        let constraint: Constraint = {
            type: constraintObject.type,
            persons: new Set(constraintObject.persons)
        };
        if (constraintObject.hasOwnProperty('mandatoryGroup'))
            constraint.mandatoryGroup = constraintObject.mandatoryGroup;
        if (constraintObject.hasOwnProperty('forbiddenGroups'))
            constraint.forbiddenGroups = new Set(constraintObject.forbiddenGroups);
        constraints.push(constraint);
    }
    return constraints;
}

export function exportPersonIds(personIds: Set<string>) {
    return Array.from(personIds);
}

export function exportGroupSizes(groupSizes: Map<string, number>) {
    let groupSizesObject: GroupSizesObject = {};
    for (let [groupId, size] of groupSizes)
        groupSizesObject[groupId] = size;
    return groupSizesObject;
}

export function exportHistory(history: Entry[]) {
    let historyArray: EntryObject[] = [];
    for (let entry of history)
        historyArray.push(exportEntry(entry));
    return historyArray;
}

export function exportEntry(entry: Entry) {
    let entryObject: EntryObject = {};
    for (let [groupId, group] of entry)
        entryObject[groupId] = Array.from(group);
    return entryObject;
}

export function exportConstraints(constraints: Constraint[]) {
    let constraintObjectsArray: Constraint[] = [];
    for (let constraint of constraints) {
        let constraintObject: ConstraintObject = {
            type: constraint.type,
            persons: Array.from(constraint.persons)
        };
        if (constraint.hasOwnProperty('mandatoryGroup'))
            constraintObject.mandatoryGroup = constraintObject.mandatoryGroup;
        if (constraint.hasOwnProperty('forbiddenGroups'))
            constraintObject.forbiddenGroups = Array.from(constraintObject.forbiddenGroups);
        constraintObjectsArray.push(constraint);
    }
    return constraintObjectsArray;
}
