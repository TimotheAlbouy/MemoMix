import { getPersonPersonKey, getPersonGroupKey, sum, min, max, randomChoice, randomShuffle, } from './util.js';
class EntryGenerator {
    constructor(personIds, groupSizes, pairingCountsMap, personOccurrencesMap, groupOccurrencesMap, constraints) {
        this.personIds = personIds;
        this.groupSizes = groupSizes;
        this.pairingCountsMap = pairingCountsMap;
        this.personOccurrencesMap = personOccurrencesMap;
        this.groupOccurrencesMap = groupOccurrencesMap;
        this.constraints = constraints;
        this.remainingPersonIds = new Set(this.personIds);
        this.entry = new Map();
        for (let groupId of this.groupSizes.keys())
            this.entry.set(groupId, new Set());
    }
    generateEntry() {
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
        this.insertCouplesWithLeastOccurrences();
        this.insertRemainingPersons();
        return this.entry;
    }
    satisfyApartConstraint(personIds) {
        let sortedPersonIds = randomShuffle(Array.from(personIds));
        sortedPersonIds.sort((person1Id, person2Id) => this.pairingCountsMap.get(person1Id) - this.pairingCountsMap.get(person2Id));
        let availableGroupIds = new Set(Array.from(this.entry.keys()).filter(groupId => this.entry.get(groupId).size < this.groupSizes.get(groupId)));
        let priorityGroupIds = new Set(Array.from(availableGroupIds).filter(groupId => this.entry.get(groupId).size > 0));
        for (let personId of sortedPersonIds) {
            let groupId = this.getGroupId(personId);
            if (groupId == null) {
                if (priorityGroupIds.size > 0) {
                    let bestGroupIds = this.getBestGroupIdsByPersonOccurrences(new Set([personId]), priorityGroupIds);
                    if (bestGroupIds.size > 1)
                        bestGroupIds = this.getBestGroupIdsByGroupOccurrences(new Set([personId]), bestGroupIds);
                    groupId = randomChoice(Array.from(bestGroupIds));
                    priorityGroupIds.delete(groupId);
                }
                else {
                    let bestGroupIds = this.getBestGroupIdsByGroupOccurrences(new Set([personId]), availableGroupIds);
                    groupId = randomChoice(Array.from(bestGroupIds));
                }
                this.entry.get(groupId).add(personId);
                this.remainingPersonIds.delete(personId);
            }
            availableGroupIds.delete(groupId);
        }
    }
    satisfyTogetherConstraint(personIds, mandatoryGroupId = null, forbiddenGroupIds = null) {
        let sortedPersonIds = randomShuffle(Array.from(personIds));
        sortedPersonIds.sort((person1Id, person2Id) => this.pairingCountsMap.get(person1Id) - this.pairingCountsMap.get(person2Id));
        let alreadyUsedGroupIds = new Set();
        let notInsertedPersonIds = [];
        for (let personId of sortedPersonIds) {
            let groupId = this.getGroupId(personId);
            if (groupId != null)
                alreadyUsedGroupIds.add(groupId);
            else
                notInsertedPersonIds.push(personId);
        }
        if (alreadyUsedGroupIds.size > 0) {
            for (let personId of notInsertedPersonIds) {
                let bestGroupIds = this.getBestGroupIdsByPersonOccurrences(new Set([personId]), alreadyUsedGroupIds);
                if (bestGroupIds) {
                    if (bestGroupIds.size > 1)
                        bestGroupIds = this.getBestGroupIdsByGroupOccurrences(new Set([personId]), bestGroupIds);
                    let groupId = randomChoice(Array.from(bestGroupIds));
                    this.entry.get(groupId).add(personId);
                    this.remainingPersonIds.delete(personId);
                }
            }
        }
        else {
            if (mandatoryGroupId != null) {
                for (let personId of sortedPersonIds) {
                    if (this.entry.get(mandatoryGroupId).size < this.groupSizes.get(mandatoryGroupId)) {
                        this.entry.get(mandatoryGroupId).add(personId);
                        this.remainingPersonIds.delete(personId);
                    }
                }
            }
            else {
                let candidateGroupIds = new Set(this.groupSizes.keys());
                if (forbiddenGroupIds != null)
                    candidateGroupIds = new Set(Array.from(candidateGroupIds).filter((groupId) => !forbiddenGroupIds.has(groupId)));
                let bestGroupIds = new Set();
                while (bestGroupIds.size == 0) {
                    bestGroupIds = this.getBestGroupIdsByPersonOccurrences(new Set(sortedPersonIds), candidateGroupIds);
                    if (bestGroupIds.size == 0) {
                        bestGroupIds = this.getBestGroupIdsByGroupOccurrences(new Set(sortedPersonIds), candidateGroupIds);
                        if (bestGroupIds.size == 0)
                            sortedPersonIds.pop();
                    }
                    else if (bestGroupIds.size > 1) {
                        bestGroupIds = this.getBestGroupIdsByGroupOccurrences(bestGroupIds, candidateGroupIds);
                    }
                }
                let groupId = randomChoice(Array.from(bestGroupIds));
                let personIds = new Set(sortedPersonIds);
                personIds.forEach(personId => this.entry.get(groupId).add(personId));
                this.remainingPersonIds = new Set(Array.from(this.remainingPersonIds).filter((personId) => !personIds.has(personId)));
            }
        }
    }
    insertCouplesWithLeastOccurrences() {
        let sortedPersonOccurrences = randomShuffle(Array.from(this.personOccurrencesMap.values()));
        sortedPersonOccurrences.sort((occurrence1, occurrence2) => {
            if (occurrence1.count < occurrence2.count)
                return -1;
            if (occurrence1.count > occurrence2.count)
                return 1;
            let min1 = Math.min(this.pairingCountsMap.get(occurrence1.person1Id), this.pairingCountsMap.get(occurrence1.person2Id));
            let min2 = Math.min(this.pairingCountsMap.get(occurrence2.person1Id), this.pairingCountsMap.get(occurrence2.person2Id));
            return min1 - min2;
        });
        let emptyGroupIds = new Set(Array.from(this.groupSizes.keys()).filter(groupId => this.entry.get(groupId).size == 0));
        while (this.remainingPersonIds.size >= 2) {
            let personOccurrence = sortedPersonOccurrences.shift();
            let { person1Id, person2Id } = personOccurrence;
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
    insertRemainingPersons() {
        let sortedRemainingPersonIds = randomShuffle(Array.from(this.remainingPersonIds));
        sortedRemainingPersonIds.sort((person1Id, person2Id) => this.pairingCountsMap.get(person1Id) - this.pairingCountsMap.get(person2Id));
        while (sortedRemainingPersonIds.length > 0) {
            let personId = sortedRemainingPersonIds.shift();
            let bestGroupIds = this.getBestGroupIdsByPersonOccurrences(new Set([personId]));
            if (bestGroupIds.size > 1)
                bestGroupIds = this.getBestGroupIdsByGroupOccurrences(new Set([personId]), bestGroupIds);
            let groupId = randomChoice(Array.from(bestGroupIds));
            this.entry.get(groupId).add(personId);
        }
        while (sortedRemainingPersonIds.length > 0) {
            let personId = sortedRemainingPersonIds.shift();
            let bestGroupIds = this.getBestGroupIdsByGroupOccurrences(new Set([personId]));
            let groupId = randomChoice(Array.from(bestGroupIds));
            this.entry.get(groupId).add(personId);
        }
    }
    getGroupId(personId) {
        for (let [groupId, group] of this.entry.entries())
            if (group.has(personId))
                return groupId;
        return null;
    }
    getBestGroupIdsByPersonOccurrences(personIds, candidateGroupIds = null) {
        let allGroupIds = new Set(this.groupSizes.keys());
        if (candidateGroupIds == null || Array.from(candidateGroupIds).some(groupId => !allGroupIds.has(groupId)))
            candidateGroupIds = allGroupIds;
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter((groupId) => this.entry.get(groupId).size > 0 &&
            this.entry.get(groupId).size + personIds.size <= this.groupSizes.get(groupId)));
        if (candidateGroupIds.size == 0)
            return new Set();
        let personOccurrencesForSubgroup = new Map();
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
        let minPersonOccurrencesAverage = min(Array.from(candidateGroupIds).map((groupId) => sum(personOccurrencesForSubgroup.get(groupId)) /
            personOccurrencesForSubgroup.get(groupId).length));
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter(groupId => sum(personOccurrencesForSubgroup.get(groupId)) /
            personOccurrencesForSubgroup.get(groupId).length
            == minPersonOccurrencesAverage));
        let maxGroupSize = max(Array.from(candidateGroupIds).map((groupId) => this.groupSizes.get(groupId)));
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter((groupId) => this.groupSizes.get(groupId) == maxGroupSize));
        return candidateGroupIds;
    }
    getBestGroupIdsByGroupOccurrences(personIds, candidateGroupIds = null) {
        let allGroupIds = new Set(this.groupSizes.keys());
        if (candidateGroupIds == null || Array.from(candidateGroupIds).some(groupId => !allGroupIds.has(groupId)))
            candidateGroupIds = allGroupIds;
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter((groupId) => this.entry.get(groupId).size + personIds.size <= this.groupSizes.get(groupId)));
        if (candidateGroupIds.size == 0)
            return new Set();
        let groupOccurrencesForSubgroup = new Map();
        for (let groupId of candidateGroupIds) {
            groupOccurrencesForSubgroup.set(groupId, []);
            for (let personId of personIds) {
                let key = getPersonGroupKey(personId, groupId);
                let groupOccurrence = this.groupOccurrencesMap.get(key).count;
                groupOccurrencesForSubgroup.get(groupId).push(groupOccurrence);
            }
        }
        let minGroupOccurrencesAverage = min(Array.from(candidateGroupIds).map((groupId) => sum(groupOccurrencesForSubgroup.get(groupId)) / groupOccurrencesForSubgroup.get(groupId).length));
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter((groupId) => sum(groupOccurrencesForSubgroup.get(groupId)) / groupOccurrencesForSubgroup.get(groupId).length
            == minGroupOccurrencesAverage));
        let maxGroupSize = max(Array.from(candidateGroupIds).map((groupId) => this.groupSizes.get(groupId)));
        candidateGroupIds = new Set(Array.from(candidateGroupIds).filter((groupId) => this.groupSizes.get(groupId) == maxGroupSize));
        return candidateGroupIds;
    }
}
export default EntryGenerator;
//# sourceMappingURL=EntryGenerator.js.map