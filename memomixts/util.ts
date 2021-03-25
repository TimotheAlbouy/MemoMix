export type Entry = Map<string, Set<string>>;

export interface Constraint {
    type: string,
    persons: Set<string>;
    mandatoryGroup?: string;
    forbiddenGroups?: Set<string>
}

export interface PersonOccurrence {
    person1Id: string;
    person2Id: string;
    count: number
}

export interface GroupOccurrence {
    personId: string;
    groupId: string;
    count: number
}

export function getPersonPersonKey(person1Id: string, person2Id: string) {
    return JSON.stringify([person1Id, person2Id].sort());
}

export function getPersonGroupKey(personId: string, groupId: string) {
    return JSON.stringify([personId, groupId]);
}

export function sum(arr: number[]) {
    return Array.from(arr).reduce((a: number, b: number) => a + b, 0);
}

export function min(arr: number[]) {
    return Math.min(...arr);
}

export function max(arr: number[]) {
    return Math.max(...arr);
}

export function all<T>(arr: T[], fn: (el: T) => boolean) {
    return arr.every(fn);
}

export function any<T>(arr: T[], fn: (el: T) => boolean) {
    return arr.some(fn);
}

export function assert(condition: boolean, message: string) {
    if (!condition)
        throw new Error('Assertion error: ' + message);
}

export function randomChoice<T>(arr: Array<T>) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function randomShuffle<T>(arr: Array<T>) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
