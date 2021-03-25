import { getPersonPersonKey, getPersonGroupKey, sum, all, assert, } from './util.js';
import EntryGenerator from './EntryGenerator.js';
class MemoMix {
    constructor(personIds, groupSizes, history = null, constraints = null) {
        if (!history)
            history = [];
        if (!constraints)
            constraints = [];
        this.checkPositiveGroupSizes(groupSizes);
        this.checkSufficientGroupSizes(personIds, groupSizes);
        for (let entry of history)
            this.checkEntryValidity(entry);
        this.personIds = personIds;
        this.groupSizes = groupSizes;
        this.history = history;
        this.checkConstraintsValidity(constraints);
        this.constraints = constraints;
    }
    getOccurrencesMaps() {
        let pairingCountsMap = new Map();
        let personOccurrencesMap = new Map();
        let groupOccurrencesMap = new Map();
        let personIdsArray = Array.from(this.personIds);
        for (let [idx, person1Id] of personIdsArray.entries()) {
            pairingCountsMap.set(person1Id, 0);
            for (let person2Id of personIdsArray.slice(idx + 1)) {
                if (person1Id != person2Id) {
                    let key = getPersonPersonKey(person1Id, person2Id);
                    personOccurrencesMap.set(key, {
                        person1Id: person1Id,
                        person2Id: person2Id,
                        count: 0
                    });
                }
            }
            for (let groupId of this.groupSizes.keys()) {
                let key = getPersonGroupKey(person1Id, groupId);
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
                            let key = getPersonPersonKey(person1Id, person2Id);
                            personOccurrencesMap.get(key).count++;
                        }
                    }
                    let key = getPersonGroupKey(person1Id, groupId);
                    groupOccurrencesMap.get(key).count++;
                }
            }
        }
        return [pairingCountsMap, personOccurrencesMap, groupOccurrencesMap];
    }
    getNewEntry() {
        let [pairingCountsMap, personOccurrencesMap, groupOccurrencesMap] = this.getOccurrencesMaps();
        let generator = new EntryGenerator(this.personIds, this.groupSizes, pairingCountsMap, personOccurrencesMap, groupOccurrencesMap, this.constraints);
        return generator.generateEntry();
    }
    checkPositiveGroupSizes(groupSizes) {
        assert(all(Array.from(groupSizes.values()), size => size >= 1), 'At least one group has a negative or null size.');
    }
    checkSufficientGroupSizes(personIds = null, groupSizes = null) {
        if (personIds == null)
            personIds = this.personIds;
        if (groupSizes == null)
            groupSizes = this.groupSizes;
        assert(personIds.size <= sum(Array.from(groupSizes.values())), 'The groups cannot contain all the persons.');
    }
    checkEntryValidity(entry) {
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
    checkConstraintsValidity(constraints) {
        let groupIds = new Set(this.groupSizes.keys());
        constraints.forEach((constraint, index) => {
            let constraintKeys = Object.keys(constraint);
            let personIds = constraint.personIds;
            for (let personId of personIds) {
                assert(this.personIds.has(personId), `The person '${personId}' in constraint #'${index}' does not exist.`);
            }
            if (constraintKeys.includes('mandatoryGroup') && constraint.mandatoryGroup != null) {
                let mandatoryGroupId = constraint.mandatoryGroup;
                assert(groupIds.has(mandatoryGroupId), `The mandatory group '${mandatoryGroupId}' in constraint #${index + 1} does not exist.`);
            }
            if (constraintKeys.includes('forbiddenGroups') && constraint.forbiddenGroups != null) {
                let forbiddenGroupIds = constraint.forbiddenGroups;
                for (let forbiddenGroupId of forbiddenGroupIds)
                    assert(groupIds.has(forbiddenGroupId), `The forbidden group '${forbiddenGroupId}' in constraint #${index + 1} does not exist.`);
            }
        });
    }
    setPersonIds(personIds) {
        this.checkSufficientGroupSizes(personIds);
        this.personIds = personIds;
    }
    setGroupSizes(groupSizes) {
        this.checkPositiveGroupSizes(groupSizes);
        this.checkSufficientGroupSizes(null, groupSizes);
        this.groupSizes = groupSizes;
    }
    setConstraints(constraints) {
        this.checkConstraintsValidity(constraints);
        this.constraints = constraints;
    }
    saveEntry(entry) {
        this.checkEntryValidity(entry);
        this.history.push(entry);
    }
}
export default MemoMix;
//# sourceMappingURL=MemoMix.js.map