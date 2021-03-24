import {
    Entry, Constraint, PersonOccurrence, GroupOccurrence,
    getPersonPersonKey, getPersonGroupKey,
    sum, min, max,
    randomChoice, randomShuffle,
} from './util.js';

class EntryGenerator {
    private personIds: Set<string>;
    private groupSizes: Map<string, number>;
    private pairingCountsMap: Map<string, number>;
    private personOccurrencesMap: Map<string, PersonOccurrence>;
    private groupOccurrencesMap: Map<string, GroupOccurrence>;
    private constraints: Constraint[];
    private remainingPersonIds: Set<string>;
    private entry: Entry;

    public constructor(personIds: Set<string>, groupSizes: Map<string, number>,
        pairingCountsMap: Map<string, number>,
        personOccurrencesMap: Map<string, PersonOccurrence>,
        groupOccurrencesMap: Map<string, GroupOccurrence>,
        constraints: Constraint[]
    ) {
        this.personIds = personIds;
        this.groupSizes = groupSizes;
        this.pairingCountsMap = pairingCountsMap;
        this.personOccurrencesMap = personOccurrencesMap;
        this.groupOccurrencesMap = groupOccurrencesMap;
        this.constraints = constraints;

        this.remainingPersonIds = new Set(this.personIds);
        this.entry = new Map<string, Set<string>>();
        // initialize the new entry with empty sets
        for (let groupId of this.groupSizes.keys())
            this.entry.set(groupId, new Set<string>());
    }

    public generateEntry() {
        // satisfy the constraints according to their priority (i.e. index in the list)
        for (let constraint of this.constraints) {
            let constraintType = constraint.type;
            let personIds = constraint.personIds;
            if (constraintType == 'apart')
                this.satisfyApartConstraint(personIds);
            else if (constraintType == 'together') {
                let constraintKeys = Object.keys(constraint);
                let mandatoryGroup = null;
                let forbiddenGroups = null;
                if (constraintKeys.includes('mandatoryGroup'))
                    mandatoryGroup = constraint.mandatoryGroup;
                if (constraintKeys.includes('forbiddenGroups'))
                    forbiddenGroups = constraint.forbiddenGroups;
                this.satisfyTogetherConstraint(personIds, mandatoryGroup, forbiddenGroups);
            }
        }
        // insert couples of persons who have been the least frequently together
        this.insertCouplesWithLeastOccurrences();
        // if there are no more empty groups that can contain a couple
        // insert the remaining persons
        this.insertRemainingPersons();
        return this.entry;
    }

    private satisfyApartConstraint(personIds: Set<string>) {
        // sort the person IDs according to their number of past pairings
        let sortedPersonIds = randomShuffle(Array.from(personIds));
        sortedPersonIds.sort((person1Id, person2Id) =>
            this.pairingCountsMap.get(person1Id) - this.pairingCountsMap.get(person2Id)
        );
        // IDs of groups that are not full
        let availableGroupIds = new Set(Array.from(this.entry.keys()).filter(
            groupId => this.entry.get(groupId).size < this.groupSizes.get(groupId)
        ));
        // IDs of groups that are not empty nor full
        let priorityGroupIds = new Set(Array.from(availableGroupIds).filter(
            groupId => this.entry.get(groupId).size > 0
        ));
        for (let personId of sortedPersonIds) {
            let groupId = this.getGroupId(personId);
            // if the person is not already inserted
            if (groupId == null) {
                // if there are still groups that are not empty nor full, use them in priority
                // so that people are less left alone
                if (priorityGroupIds.size > 0) {
                    let bestGroupIds = this.getBestGroupIdsByPersonOccurrences(
                        new Set([personId]), priorityGroupIds
                    );
                    // if there is a tie
                    if (bestGroupIds.size > 1)
                        bestGroupIds = this.getBestGroupIdsByGroupOccurrences(
                            new Set([personId]), bestGroupIds
                        );
                    // in case there is still a tie, choose randomly
                    groupId = randomChoice(Array.from(bestGroupIds));
                    priorityGroupIds.delete(groupId);
                } else {
                    let bestGroupIds = this.getBestGroupIdsByGroupOccurrences(
                        new Set([personId]), availableGroupIds
                    );
                    groupId = randomChoice(Array.from(bestGroupIds));
                }
                this.entry.get(groupId).add(personId);
                this.remainingPersonIds.delete(personId);
            }
            availableGroupIds.delete(groupId);
        }
    }

    private satisfyTogetherConstraint(
        personIds: Set<string>, mandatoryGroupId: string=null, forbiddenGroupIds: Set<string>=null
    ) {
        // sort the person IDs according to their number of past pairings
        let sortedPersonIds = randomShuffle(Array.from(personIds));
        sortedPersonIds.sort((person1Id, person2Id) =>
            this.pairingCountsMap.get(person1Id) - this.pairingCountsMap.get(person2Id)
        );
        let alreadyUsedGroupIds = new Set<string>();
        let notInsertedPersonIds = [];
        for (let personId of sortedPersonIds) {
            let groupId = this.getGroupId(personId)
            if (groupId != null)
                alreadyUsedGroupIds.add(groupId)
            else notInsertedPersonIds.push(personId);
        }
        // if there are some groups where some of the persons of the constraint have already been inserted,
        // use them in priority
        if (alreadyUsedGroupIds.size > 0) {
            for (let personId of notInsertedPersonIds) {
                let bestGroupIds = this.getBestGroupIdsByPersonOccurrences(
                    new Set([personId]), alreadyUsedGroupIds
                );
                // if there are still groups to insert the person
                if (bestGroupIds) {
                    if (bestGroupIds.size > 1)
                        bestGroupIds = this.getBestGroupIdsByGroupOccurrences(
                            new Set([personId]), bestGroupIds
                        );
                    // in case there is still a tie, choose randomly
                    let groupId = randomChoice(Array.from(bestGroupIds));
                    this.entry.get(groupId).add(personId);
                    this.remainingPersonIds.delete(personId);
                }
            }
        } else {
            // if there is a mandatory group
            if (mandatoryGroupId != null) {
                for (let personId of sortedPersonIds) {
                    // if the group is not full
                    if (this.entry.get(mandatoryGroupId).size < this.groupSizes.get(mandatoryGroupId)) {
                        this.entry.get(mandatoryGroupId).add(personId);
                        this.remainingPersonIds.delete(personId);
                    }
                }
            } else {
                let candidateGroupIds = new Set(this.groupSizes.keys());
                // if there are forbidden groups
                if (forbiddenGroupIds != null)
                    candidateGroupIds = new Set(Array.from(candidateGroupIds).filter(
                        (groupId: string) => !forbiddenGroupIds.has(groupId)
                    ));
                let bestGroupIds = new Set<string>();
                while (bestGroupIds.size == 0) {
                    bestGroupIds = this.getBestGroupIdsByPersonOccurrences(
                        new Set(sortedPersonIds), candidateGroupIds
                    );
                    if (bestGroupIds.size == 0) {
                        bestGroupIds = this.getBestGroupIdsByGroupOccurrences(
                            new Set(sortedPersonIds), candidateGroupIds
                        )
                        if (bestGroupIds.size == 0)
                            sortedPersonIds.pop();
                    } else if (bestGroupIds.size > 1) {
                        bestGroupIds = this.getBestGroupIdsByGroupOccurrences(
                            bestGroupIds, candidateGroupIds
                        );
                    }
                }
                let groupId = randomChoice(Array.from(bestGroupIds));
                let personIds = new Set(sortedPersonIds);
                personIds.forEach(personId => this.entry.get(groupId).add(personId));
                this.remainingPersonIds = new Set(Array.from(this.remainingPersonIds).filter(
                    (personId: string) => !personIds.has(personId)
                ));
            }
        }
    }

    private insertCouplesWithLeastOccurrences() {
        // sort the person-person pairings using 2 keys:
        // - primary: number of occurrences where the 2 persons have been together
        // - secondary: minimum number of pairings for the 2 persons
        let sortedPersonOccurrences = randomShuffle(Array.from(this.personOccurrencesMap.values()));
        sortedPersonOccurrences.sort(
            (occurrence1: PersonOccurrence, occurrence2: PersonOccurrence) => {
                if (occurrence1.count < occurrence2.count)
                    return -1;
                if (occurrence1.count > occurrence2.count)
                    return 1;
                let min1 = Math.min(
                    this.pairingCountsMap.get(occurrence1.person1Id), this.pairingCountsMap.get(occurrence1.person2Id)
                );
                let min2 = Math.min(
                    this.pairingCountsMap.get(occurrence2.person1Id), this.pairingCountsMap.get(occurrence2.person2Id)
                );
                return min1 - min2;
            }
        );

        let emptyGroupIds = new Set(Array.from(this.groupSizes.keys()).filter(
            groupId => this.entry.get(groupId).size == 0
        ));
        
        // insert in empty groups couples of persons who have been the least frequently together
        while (this.remainingPersonIds.size >= 2) {
            let personOccurrence = sortedPersonOccurrences.shift();
            let { person1Id, person2Id } = personOccurrence;
            // if the two persons have not been already inserted
            if (!this.remainingPersonIds.has(person1Id) && !this.remainingPersonIds.has(person2Id)) {
                let personIds = new Set([person1Id, person2Id]);
                let bestGroupIds = this.getBestGroupIdsByGroupOccurrences(personIds, emptyGroupIds);
                if (bestGroupIds.size == 0)
                    return;
                let groupId = randomChoice(Array.from(bestGroupIds));
                personIds.forEach(personId => this.entry.get(groupId).add(personId));
                this.remainingPersonIds.delete(person1Id);
                this.remainingPersonIds.delete(person2Id);
                emptyGroupIds.delete(groupId);
            }
        }
    }

    private insertRemainingPersons() {
        // sort the person IDs according to their number of past pairings
        let sortedRemainingPersonIds = randomShuffle(Array.from(this.remainingPersonIds));
        sortedRemainingPersonIds.sort((person1Id, person2Id) =>
            this.pairingCountsMap.get(person1Id) - this.pairingCountsMap.get(person2Id)
        );

        // put the remaining persons in non-full and non-empty groups
        // in a way to minimize the average number of occurrences with other persons
        while (sortedRemainingPersonIds.length > 0) {
            // get the person ID with the lowest number of past pairings
            let personId = sortedRemainingPersonIds.shift();
            let bestGroupIds = this.getBestGroupIdsByPersonOccurrences(new Set([personId]));
            // if there is a tie
            if (bestGroupIds.size > 1)
                bestGroupIds = this.getBestGroupIdsByGroupOccurrences(new Set([personId]), bestGroupIds);
            // in case there is still a tie, choose randomly
            let groupId = randomChoice(Array.from(bestGroupIds));
            this.entry.get(groupId).add(personId);
        }

        // if there still remains non-inserted persons
        // insert them in the remaining empty groups, i.e. groups of size 1
        // (unless there was only 1 person to insert to begin with)
        while (sortedRemainingPersonIds.length > 0) {
            // get the person ID with the lowest number of past pairings
            let personId = sortedRemainingPersonIds.shift();
            let bestGroupIds = this.getBestGroupIdsByGroupOccurrences(new Set([personId]));
            // in case there is a tie, choose randomly
            let groupId = randomChoice(Array.from(bestGroupIds));
            this.entry.get(groupId).add(personId);
        }
    }

    private getGroupId(personId: string) {
        for (let [groupId, group] of this.entry.entries())
            if (group.has(personId))
                return groupId;
        return null;
    }

    private getBestGroupIdsByPersonOccurrences(
        personIds: Set<string>, candidateGroupIds: Set<string>=null
    ): Set<string> {
        // if no candidate group IDs were given
        // or at least one candidate group ID does not exist
        // then all group IDs are candidates
        let allGroupIds = new Set(this.groupSizes.keys());
        if (candidateGroupIds == null || Array.from(candidateGroupIds).some(groupId => !allGroupIds.has(groupId)))
            candidateGroupIds = allGroupIds;
        // the IDs of the groups which are not empty and that can contain the subgroup
        // (the group must be non-empty for the average of occurrences to be calculated)
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter(
            (groupId: string) => this.entry.get(groupId).size > 0 &&
                this.entry.get(groupId).size + personIds.size <= this.groupSizes.get(groupId),
        ));
        // if no group ID was found
        if (candidateGroupIds.size == 0)
            return new Set();
        // the dictionary giving for each candidate group ID
        // the associated list of occurrences of each person of the subgroup to insert
        // with all the persons in the current group
        let personOccurrencesForSubgroup = new Map<string, Array<number>>();
        for (let groupId of candidateGroupIds) {
            personOccurrencesForSubgroup.set(groupId, []);
            for (let person1Id of personIds) {
                for (let person2Id of this.entry.get(groupId)) {
                    let key = getPersonPersonKey(person1Id, person2Id);
                    let personOccurrence = this.personOccurrencesMap.get(key).count;
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

    private getBestGroupIdsByGroupOccurrences(
        personIds: Set<string>, candidateGroupIds: Set<string>=null
    ): Set<string> {
        // if no candidate group IDs were given
        // or at least one candidate group ID does not exist
        // then all group IDs are candidates
        let allGroupIds = new Set(this.groupSizes.keys());
        if (candidateGroupIds == null || Array.from(candidateGroupIds).some(groupId => !allGroupIds.has(groupId)))
            candidateGroupIds = allGroupIds;
        // the IDs of the groups that can contain the subgroup
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter(
            (groupId: string) =>
            this.entry.get(groupId).size + personIds.size <= this.groupSizes.get(groupId)
        ));
        // if no group ID was found
        if (candidateGroupIds.size == 0)
            return new Set();
        // the dictionary giving for each candidate group ID
        // the associated list of occurrences of each person with the group
        let groupOccurrencesForSubgroup = new Map<string, number[]>();
        for (let groupId of candidateGroupIds) {
            groupOccurrencesForSubgroup.set(groupId, []);
            for (let personId of personIds) {
                let key = getPersonGroupKey(personId, groupId);
                let groupOccurrence = this.groupOccurrencesMap.get(key).count;
                groupOccurrencesForSubgroup.get(groupId).push(groupOccurrence);
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
}

export default EntryGenerator;