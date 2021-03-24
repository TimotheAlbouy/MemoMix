export function getPersonPersonKey(person1Id, person2Id) {
    return JSON.stringify([person1Id, person2Id].sort());
}
export function getPersonGroupKey(personId, groupId) {
    return JSON.stringify([personId, groupId]);
}
export function sum(arr) {
    return Array.from(arr).reduce((a, b) => a + b, 0);
}
export function min(arr) {
    return Math.min(...arr);
}
export function max(arr) {
    return Math.max(...arr);
}
export function all(arr, fn) {
    return arr.every(fn);
}
export function any(arr, fn) {
    return arr.some(fn);
}
export function assert(condition, message) {
    if (!condition)
        throw new Error('Assertion error: ' + message);
}
export function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
export function randomShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
//# sourceMappingURL=util.js.map