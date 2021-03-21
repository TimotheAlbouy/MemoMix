type Entry = Map<string, Set<string>>;

interface Constraint {
    personIds: Set<string>;
    inGroup?: string;
    notInGroups?: Set<string>
}

interface PersonOccurrence {
    person1Id: string;
    person2Id: string;
    count: number
}

interface GroupOccurrence {
    personId: string;
    groupId: string;
    count: number
}

class MemoMix {
    private personIds: Set<string>;
    private groupSizes: Map<string, number>;
    private history: Entry[];
    private togetherConstraints: Constraint[];
    private apartConstraints: Constraint[];

    public constructor(
        personIds: Set<string>, groupSizes: Map<string, number>,
        history: Entry[]=null,
        togetherConstraints: Constraint[]=null,
        apartConstraints: Constraint[]=null
    ) {
        if (!history) history = [];
        if (!togetherConstraints) togetherConstraints = [];
        if (!apartConstraints) apartConstraints = [];

        assert(
            personIds.size <= sum(Array.from(groupSizes.values())),
            'The groups cannot contain all the persons.'
        );
        assert(
            all(Array.from(groupSizes.values()), size => size >= 1),
            'At least one group has a negative or null size.'
        );
        for (let entry of history)
            assert(this.checkEntryValidity(entry), 'Invalid entry.');

        this.personIds = personIds;
        this.groupSizes = groupSizes;
        this.history = history;

        assert(
            this.checkConstraintsValidity(togetherConstraints, apartConstraints),
            'Invalid constraints.'
        );
        this.togetherConstraints = togetherConstraints;
        this.apartConstraints = apartConstraints;
    }

    public setPersonIds(personIds: Set<string>) {
        assert(
            personIds.size <= sum(Array.from(this.groupSizes.values())),
            'The groups cannot contain all the persons.'
        );
        this.personIds = personIds;
    }

    public setGroupSizes(groupSizes: Map<string, number>) {
        assert(
            this.personIds.size <= sum(Array.from(groupSizes.values())),
            'The groups cannot contain all the persons.'
        );
        assert(
            all(Array.from(groupSizes.values()), size => size >= 1),
            'At least one group has a negative or null size.'
        );
        this.groupSizes = groupSizes;
    }

    public setConstraints(
        togetherConstraints: Constraint[],
        apartConstraints: Constraint[]
    ) {
        assert(
            this.checkConstraintsValidity(togetherConstraints, apartConstraints),
            'Invalid constraints.'
        );
        this.togetherConstraints = togetherConstraints;
        this.apartConstraints = apartConstraints;
    }

    private getPersonPersonKey(person1Id: string, person2Id: string) {
        return JSON.stringify([person1Id, person2Id].sort());
    }

    private getPersonGroupKey(personId: string, groupId: string) {
        return JSON.stringify([personId, groupId]);
    }

    private getOccurrencesMaps():
        [Map<string, number>, Map<string, PersonOccurrence>, Map<string, GroupOccurrence>]
    {
        let pairingCountsMap = new Map<string, number>();
        let personOccurrencesMap = new Map<string, PersonOccurrence>();
        let groupOccurrencesMap = new Map<string, GroupOccurrence>();

        let personIdsArray = Array.from(this.personIds);
        for (let [idx, person1Id] of personIdsArray.entries()) {
            pairingCountsMap.set(person1Id, 0);
            for (let person2Id of personIdsArray.slice(idx + 1)) {
                if (person1Id != person2Id) {
                    let key = this.getPersonPersonKey(person1Id, person2Id);
                    personOccurrencesMap.set(key, {
                        person1Id: person1Id,
                        person2Id: person2Id,
                        count: 0
                    });
                }
            }
            for (let groupId of this.groupSizes.keys()) {
                let key = this.getPersonGroupKey(person1Id, groupId);
                groupOccurrencesMap.set(key, {
                    personId: person1Id,
                    groupId: groupId,
                    count: 0
                });
            }
        }

        for (let entry of this.history) {
            for (let [groupId, group] of entry.entries()) {
                let groupArray = Array.from(group);
                for (let [idx, person1Id] of groupArray.entries()) {
                    let newPairingCount = pairingCountsMap.get(person1Id) + group.size - 1;
                    pairingCountsMap.set(person1Id, newPairingCount);
                    for (let person2Id of groupArray.slice(idx + 1)) {
                        if (this.personIds.has(person1Id) && this.personIds.has(person2Id)) {
                            let key = this.getPersonPersonKey(person1Id, person2Id);
                            personOccurrencesMap.get(key).count++;
                        }
                    }
                    let key = this.getPersonGroupKey(person1Id, groupId);
                    groupOccurrencesMap.get(key).count++;
                }
            }
        }

        return [pairingCountsMap, personOccurrencesMap, groupOccurrencesMap];
    }

    private initializeEntry(
        personOccurrencesMap: Map<string, PersonOccurrence>,
        groupOccurrencesMap: Map<string, GroupOccurrence>
    ): [Entry, string[]] {
        let entry: Entry = new Map<string, Set<string>>();
        let remainingPersonIds = [...this.personIds];
        // initialize the entry with empty sets
        for (let groupId of this.groupSizes.keys())
            entry.set(groupId, new Set<string>());
        // satisfy the 'together' constraints
        for (let constraint of this.togetherConstraints) {
            let constraintKeys = Object.keys(constraint);
            let personIds = constraint.personIds;
            let groupId: string;
            if (constraintKeys.includes('inGroup'))
                groupId = constraint.inGroup;
            else {
                let candidateGroupIds = new Set(this.groupSizes.keys());
                if (constraintKeys.includes('notInGroups')) {
                    let forbiddenGroupIds = constraint.notInGroups;
                    candidateGroupIds = new Set(Array.from(candidateGroupIds).filter(
                        (groupId: string) => !forbiddenGroupIds.has(groupId)
                    ));
                }
                let bestGroupIds = this.getBestGroupIdsByGroupOccurrences(
                    personIds, entry, groupOccurrencesMap, candidateGroupIds
                );
                // there must be at least one group that can contain the person
                // otherwise the constraints are not satisfiable
                assert(bestGroupIds.size > 0, 'Invalid constraints.');
                groupId = randomChoice(Array.from(bestGroupIds));
            }
            personIds.forEach(personId => entry.get(groupId).add(personId));
            remainingPersonIds = remainingPersonIds.filter(personId => !personIds.has(personId));
        }
        // satisfy the 'apart' constraints
        for (let constraint of this.apartConstraints) {
            let personIds = constraint.personIds;
            // IDs of groups that are not full
            let availableGroupIds = new Set(Array.from(entry.keys()).filter(
                groupId => entry.get(groupId).size < this.groupSizes.get(groupId)
            ));
            // IDs of groups that are not empty nor full
            let priorityGroupIds = new Set(Array.from(availableGroupIds).filter(
                groupId => entry.get(groupId).size > 0
            ));
            for (let personId of personIds) {
                let groupId;
                // if there are still available groups that are not empty nor full, use them in priority
                // so that if there are 3 persons and 3 groups of size >= 2 such that 2 persons must be apart
                // we do not end up with 1 person per group
                if (priorityGroupIds.size > 0) {
                    groupId = randomChoice(Array.from(priorityGroupIds));
                    priorityGroupIds.delete(groupId);
                } else {
                    groupId = this.getGroupId(personId, entry);
                    if (!groupId) {
                        let bestGroupIds = this.getBestGroupIdsByPersonOccurrences(
                            new Set([personId]), entry, personOccurrencesMap, availableGroupIds
                        );
                        // there must be at least one group that can contain the person
                        // otherwise the constraints are not satisfiable
                        assert(bestGroupIds.size > 0, 'Constraints not satisfiable.');
                        groupId = randomChoice(Array.from(bestGroupIds));
                    }
                }
                entry.get(groupId).add(personId);
                let idx = remainingPersonIds.indexOf(personId);
                remainingPersonIds.splice(idx, 1);
                availableGroupIds.delete(groupId);
            }
        }
        return [entry, remainingPersonIds];
    }

    public getNewEntry() {
        let [pairingCountsMap, personOccurrencesMap, groupOccurrencesMap] = this.getOccurrencesMaps();
        let [entry, remainingPersonIds] = this.initializeEntry(personOccurrencesMap, groupOccurrencesMap);
        // shuffle the array beforehand to make sure that elements having the same
        // sorting value do not always appear in the same order
        randomShuffle(remainingPersonIds);
        // sort the person IDs according to their number of past pairings
        remainingPersonIds.sort((person1Id, person2Id) =>
             pairingCountsMap.get(person1Id) - pairingCountsMap.get(person2Id)
        );

        // shuffle the array beforehand to make sure that elements having the same
        // sorting value do not always appear in the same order
        let personOccurrences = Array.from(personOccurrencesMap.values());
        randomShuffle(personOccurrences);
        // sort the person-person pairings using 2 values:
        // - primary: number of occurrences where the 2 persons have been together
        // - secondary: minimum number of pairings for the 2 persons
        personOccurrences.sort(
            (occurrence1: PersonOccurrence, occurrence2: PersonOccurrence) => {
                if (occurrence1.count < occurrence2.count)
                    return -1;
                if (occurrence1.count > occurrence2.count)
                    return 1;
                let min1 = Math.min(
                    pairingCountsMap.get(occurrence1.person1Id), pairingCountsMap.get(occurrence1.person2Id)
                );
                let min2 = Math.min(
                    pairingCountsMap.get(occurrence2.person1Id), pairingCountsMap.get(occurrence2.person2Id)
                );
                return min1 - min2;
            }
        );

        // put in priority couples of persons who have been the least frequently together
        let emptyGroup2Id = this.getEmptyGroup2Id(entry);
        while (remainingPersonIds.length >= 2 && emptyGroup2Id != null) {
            let personOccurrence = personOccurrences.shift();
            let { person1Id, person2Id } = personOccurrence;
            // if the two persons have not been already inserted
            let idx1 = remainingPersonIds.indexOf(person1Id);
            let idx2 = remainingPersonIds.indexOf(person2Id);
            if (idx1 != -1 && idx2 != -1) {
                entry.get(emptyGroup2Id).add(person1Id);
                entry.get(emptyGroup2Id).add(person2Id);
                if (idx1 < idx2) {
                    remainingPersonIds.splice(idx2, 1);
                    remainingPersonIds.splice(idx1, 1);
                } else {
                    remainingPersonIds.splice(idx1, 1);
                    remainingPersonIds.splice(idx2, 1);
                }
                emptyGroup2Id = this.getEmptyGroup2Id(entry);
            }
        }

        // if there are no more empty groups that can contain a couple
        // put the remaining persons in non-full and non-empty groups
        // in a way to minimize the average number of occurrences with other persons
        while (this.containsNonFullNonEmptyGroup(entry) && remainingPersonIds.length > 0) {
            // get the person ID with the lowest number of past pairings
            let personId = remainingPersonIds.shift();
            let bestGroupIds = this.getBestGroupIdsByPersonOccurrences(
                new Set([personId]), entry, personOccurrencesMap
            );
            // if there is a tie
            if (bestGroupIds.size > 1) {
                bestGroupIds = this.getBestGroupIdsByGroupOccurrences(
                    new Set([personId]), entry, groupOccurrencesMap, bestGroupIds
                );
            }
            // in case there is still a tie, choose randomly
            let groupId = randomChoice(Array.from(bestGroupIds));
            entry.get(groupId).add(personId);
        }

        // if there still remains non-inserted persons
        // insert them in the remaining empty groups
        // (if there was more than 1 person, the only remaining groups are of size 1)
        while (remainingPersonIds.length > 0) {
            let personId = remainingPersonIds.shift();
            let bestGroupIds = this.getBestGroupIdsByGroupOccurrences(
                new Set([personId]), entry, groupOccurrencesMap
            );
            // in case there is a tie, choose randomly
            let groupId = randomChoice(Array.from(bestGroupIds));
            entry.get(groupId).add(personId);
        }

        return entry;
    }

    private getEmptyGroup2Id(entry: Entry) {
        // we shuffle the array beforehand to make sure that elements having the same
        // sorting value do not always appear in the same order
        // the values are sorted in the reverse order
        let sortedGroups = randomShuffle(Array.from(this.groupSizes.keys())).sort(
            (group1Id: string, group2Id: string) =>
            this.groupSizes.get(group2Id) - this.groupSizes.get(group1Id)
        );
        for (let groupId of sortedGroups)
            if (entry.get(groupId).size == 0 && this.groupSizes.get(groupId) >= 2)
                return groupId;
        return null;
    }

    private containsNonFullNonEmptyGroup(entry: Entry) {
        for (let [groupId, group] of entry.entries())
            if (group.size > 0 && group.size < this.groupSizes.get(groupId))
                return true;
        return false;
    }

    private getGroupId(personId: string, entry: Entry) {
        for (let [groupId, group] of entry.entries())
            if (group.has(personId))
                return groupId;
        return null;
    }

    private getBestGroupIdsByPersonOccurrences(
        personIds: Set<string>, entry: Entry,
        personOccurrencesDict: Map<string, PersonOccurrence>,
        candidateGroupIds: Set<string>=null
    ) {
        // if no candidate group IDs were given
        // or at least one candidate group ID does not exist
        // then all group IDs are candidates
        let allGroupIds = new Set(this.groupSizes.keys());
        if (!candidateGroupIds || Array.from(candidateGroupIds).some(groupId => !allGroupIds.has(groupId)))
            candidateGroupIds = allGroupIds;
        // the IDs of the groups which are not empty and that can contain the subgroup
        // (the group must be non-empty for the average of occurrences to be calculated)
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter(
            (groupId: string) =>
            entry.get(groupId).size > 0 && entry.get(groupId).size + personIds.size <= this.groupSizes.get(groupId),
        ));
        // if no group ID was found
        if (candidateGroupIds.size == 0)
            return null;
        // the dictionary giving for each candidate group ID
        // the associated list of occurrences of each person of the subgroup to insert
        // with all the persons in the current group
        let personOccurrencesForSubgroup = new Map<string, Array<number>>();
        for (let groupId of candidateGroupIds) {
            personOccurrencesForSubgroup.set(groupId, []);
            for (let person1Id of personIds) {
                for (let person2Id of entry.get(groupId)) {
                    let key = this.getPersonPersonKey(person1Id, person2Id);
                    let personOccurrence = personOccurrencesDict.get(key).count;
                    personOccurrencesForSubgroup.get(groupId).push(personOccurrence);
                }
            }
        }
        // the minimum average of occurrences of all the persons of the subgroup
        // with any group of persons in the entry
        let minPersonOccurrencesAverage = min(Array.from(candidateGroupIds).map(
            (groupId: string) =>
            sum(personOccurrencesForSubgroup.get(groupId)) /
            personOccurrencesForSubgroup.get(groupId).length
        ));
        // the IDs of the groups of persons having the minimum average of occurrences with the subgroup
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter(groupId =>
            sum(personOccurrencesForSubgroup.get(groupId)) /
            personOccurrencesForSubgroup.get(groupId).length
            == minPersonOccurrencesAverage
        ));
        return candidateGroupIds;
    }

    private getBestGroupIdsByGroupOccurrences(
        personIds: Set<string>, entry: Entry,
        groupOccurrencesMap: Map<string, GroupOccurrence>,
        candidateGroupIds: Set<string>=null
    ) {
        // if no candidate group IDs were given
        // or at least one candidate group ID does not exist
        // then all group IDs are candidates
        let allGroupIds = new Set(this.groupSizes.keys());
        if (!candidateGroupIds || Array.from(candidateGroupIds).some(groupId => !allGroupIds.has(groupId)))
            candidateGroupIds = allGroupIds;
        // the IDs of the groups that can contain the subgroup
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter(
            (groupId: string) =>
            entry.get(groupId).size + personIds.size <= this.groupSizes.get(groupId)
        ));
        // if no group ID was found
        if (candidateGroupIds.size == 0)
            return null;
        // the dictionary giving for each candidate group ID
        // the associated list of occurrences of each person with the group
        let groupOccurrencesForSubgroup = new Map<string, number[]>();
        for (let groupId of candidateGroupIds) {
            groupOccurrencesForSubgroup.set(groupId, []);
            for (let personId of personIds) {
                let key = this.getPersonGroupKey(personId, groupId);
                groupOccurrencesForSubgroup.get(groupId).push(groupOccurrencesMap.get(key).count);
            }
        }
        // the minimum average of occurrences of any person in the subgroup with any of the candidate groups
        let minGroupOccurrencesAverage = min(Array.from(candidateGroupIds).map(
            (groupId: string) =>
            sum(groupOccurrencesForSubgroup.get(groupId)) / groupOccurrencesForSubgroup.get(groupId).length
        ));
        // the IDs of the candidate groups which have the minimum number of occurrences with the person
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter(
            (groupId: string) =>
            sum(groupOccurrencesForSubgroup.get(groupId)) / groupOccurrencesForSubgroup.get(groupId).length
            == minGroupOccurrencesAverage
        ));
        // the maximum group size in the candidate groups
        let maxGroupSize = max(Array.from(candidateGroupIds).map(
            (groupId: string) => this.groupSizes.get(groupId)
        ));
        // the IDs of the filtered groups which have the maximum size
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter(
            (groupId: string) => this.groupSizes.get(groupId) == maxGroupSize
        ));
        return candidateGroupIds;
    }

    private checkEntryValidity(entry: Entry) {
        let personIds = new Set();
        for (let group of entry.values()) {
            for (let personId of group) {
                if (personIds.has(personId))
                    return false;
                personIds.add(personId);
            }
        }
        return true;
    }

    private checkConstraintsValidity(
        togetherConstraints: Constraint[], apartConstraints: Constraint[]
    ) {
        // check that all person and group IDs are valid
        if (togetherConstraints.length > 0) {
            let groupIds = new Set(this.groupSizes.keys());
            for (let constraint of togetherConstraints) {
                let constraintKeys = Object.keys(constraint);
                let personIds = constraint.personIds;
                for (let personId of personIds)
                    // if any of the person IDs does not exist
                    if (!this.personIds.has(personId))
                        return false;
                // if the 'in' group ID does not exist
                if (constraintKeys.includes('inGroup') && !groupIds.has(constraint.inGroup))
                    return false;
                if (constraintKeys.includes('notInGroups')) {
                    let forbiddenGroupIds = constraint.notInGroups;
                    // if all the group IDs are forbidden
                    if (Array.from(groupIds).every(groupId => forbiddenGroupIds.has(groupId)))
                        return false;
                }
            }
        }
        if (apartConstraints.length > 0) {
            for (let constraint of apartConstraints) {
                let personIds = constraint.personIds;
                for (let personId of personIds)
                    // if any of the person IDs does not exist
                    if (!this.personIds.has(personId))
                        return false;
            }
        }
        return true;
    }

    public saveEntry(entry: Entry) {
        assert(this.checkEntryValidity(entry), 'Invalid entry.');
        this.history.push(entry);
    }
}

function randomChoice(arr: Array<any>) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomShuffle(arr: Array<any>) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function sum(arr: number[]) {
    return Array.from(arr).reduce((a: number, b: number) => a + b, 0);
}

function min(arr: number[]) {
    return Math.min(...arr);
}

function max(arr: number[]) {
    return Math.max(...arr);
}

function all<T>(arr: T[], fn: (el: T) => boolean) {
    return arr.every(fn);
}

/*
function any<T>(arr: T[], fn: (el: T) => boolean) {
    return arr.some(fn);
}*/

function assert(condition: boolean, message: string) {
    if (!condition)
        throw new Error('Assertion error: ' + message);
}

export default MemoMix;