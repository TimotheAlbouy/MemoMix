import {
    Entry, Constraint, PersonOccurrence, GroupOccurrence,
    getPersonPersonKey, getPersonGroupKey,
    sum, all, assert,
} from './util.js';
import EntryGenerator from './EntryGenerator.js';

class MemoMix {
    private personIds: Set<string>;
    private groupSizes: Map<string, number>;
    private history: Entry[];
    private constraints: Constraint[];

    public constructor(
        persons: Set<string>, groupSizes: Map<string, number>,
        history: Entry[]=null, constraints: Constraint[]=null
    ) {
        if (!history) history = [];
        if (!constraints) constraints = [];

        this.checkPositiveGroupSizes(groupSizes);
        this.checkSufficientGroupSizes(persons, groupSizes);
        for (let entry of history)
            this.checkEntryValidity(entry);

        this.personIds = persons;
        this.groupSizes = groupSizes;
        this.history = history;

        this.checkConstraintsValidity(constraints);
        this.constraints = constraints;
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

    public getNewEntry() {
        let [pairingCountsMap, personOccurrencesMap, groupOccurrencesMap] = this.getOccurrencesMaps();
        let generator = new EntryGenerator(
            this.personIds, this.groupSizes,
            pairingCountsMap, personOccurrencesMap, groupOccurrencesMap,
            this.constraints
        );
        return generator.generateEntry();
    }

    // ------------------------ GUARDS ------------------------ //

    checkPositiveGroupSizes(groupSizes: Map<string, number>) {
        assert(
            all(Array.from(groupSizes.values()), size => size >= 1),
            'At least one group has a negative or null size.'
        );
    }
    
    checkSufficientGroupSizes(personIds: Set<string>=null, groupSizes: Map<string, number>=null) {
        if (personIds == null)
            personIds = this.personIds;
        if (groupSizes == null)
            groupSizes = this.groupSizes;
        assert(
            personIds.size <= sum(Array.from(groupSizes.values())),
            'The groups cannot contain all the persons.'
        );
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

    private checkConstraintsValidity(constraints: Constraint[]) {
        // check that all person and group IDs are valid
        let groupIds = new Set(this.groupSizes.keys());
        constraints.forEach((constraint, index) => {
            let constraintKeys = Object.keys(constraint);
            let personIds = constraint.persons;
            for (let personId of personIds) {
                assert(
                    this.personIds.has(personId),
                    `The person '${personId}' in constraint #'${index}' does not exist.`
                )
            }
            if (constraintKeys.includes('mandatoryGroup') && constraint.mandatoryGroup != null) {
                let mandatoryGroupId = constraint.mandatoryGroup;
                assert(
                    groupIds.has(mandatoryGroupId),
                    `The mandatory group '${mandatoryGroupId}' in constraint #${index+1} does not exist.`
                );
            }
            if (constraintKeys.includes('forbiddenGroups') && constraint.forbiddenGroups != null) {
                let forbiddenGroupIds = constraint.forbiddenGroups;
                for (let forbiddenGroupId of forbiddenGroupIds)
                    assert(
                        groupIds.has(forbiddenGroupId),
                        `The forbidden group '${forbiddenGroupId}' in constraint #${index+1} does not exist.`
                    );
            }
        });
    }

    // ------------------------ SETTERS ------------------------ //

    public setPersonIds(personIds: Set<string>) {
        this.checkSufficientGroupSizes(personIds);
        this.personIds = personIds;
    }

    public setGroupSizes(groupSizes: Map<string, number>) {
        this.checkPositiveGroupSizes(groupSizes);
        this.checkSufficientGroupSizes(null, groupSizes);
        this.groupSizes = groupSizes;
    }

    public setConstraints(constraints: Constraint[]) {
        this.checkConstraintsValidity(constraints);
        this.constraints = constraints;
    }

    public saveEntry(entry: Entry) {
        this.checkEntryValidity(entry);
        this.history.push(entry);
    }
}

export default MemoMix;