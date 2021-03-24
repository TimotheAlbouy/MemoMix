import MemoMix from './memomix.js';
import { importPersonIds, importGroupSizes, importHistory, importConstraints } from './projectImportExport.js';
let personIdsArray = [
    'Timothé',
    'François',
    'Laurent',
    'Théo',
    'Arnaud',
    'Jean',
    'Cyril',
    'Théophane',
    'Erwann',
];
let groupsSizesObject = {
    g1: 3,
    g2: 3,
    g3: 3
};
let historyArray = [
    {
        g1: ['Timothé', 'François', 'Laurent'],
        g2: ['Théo', 'Arnaud', 'Jean'],
        g3: ['Cyril', 'Théophane', 'Erwann']
    },
    {
        g1: ['Timothé', 'Théophane', 'Jean'],
        g2: ['Théo', 'François', 'Erwann'],
        g3: ['Cyril', 'Arnaud', 'Laurent']
    }
];
let constraintsArray = [
    { type: 'together', personIds: ['Timothé', 'François'], mandatoryGroup: 'g1' },
    { type: 'together', personIds: ['Cyril'], forbiddenGroups: ['g2'] },
    { type: 'apart', personIds: ['Arnaud', 'Théophane'] }
];
let personIds = importPersonIds(personIdsArray);
let groupSizes = importGroupSizes(groupsSizesObject);
let history = importHistory(historyArray);
let constraints = importConstraints(constraintsArray);
let mm = new MemoMix(personIds, groupSizes, history, constraints);
let bugsMandatoryGroup = 0;
let bugsForbiddenGroups = 0;
let bugsApart = 0;
for (let i = 0; i < 1000; i++) {
    let entry = mm.getNewEntry();
    for (let [groupId, personIds] of entry.entries()) {
        if (groupId == 'g1' && (!personIds.has('Timothé') || !personIds.has('François')))
            bugsMandatoryGroup += 1;
        if (groupId == 'g2' && personIds.has('Cyril'))
            bugsForbiddenGroups += 1;
        if (personIds.has('Arnaud') && personIds.has('Théophane'))
            bugsApart += 1;
    }
}
console.log('Bugs mandatory groups:', bugsMandatoryGroup / 1000);
console.log('Bugs forbidden groups:', bugsForbiddenGroups / 1000);
console.log('Bugs apart:', bugsApart / 1000);
//# sourceMappingURL=test.js.map