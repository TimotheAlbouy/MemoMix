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

let togetherConstraintsArray = [
    {
        personIds: ['Timothé', 'François'],
        inGroup: 'g1'
    },
    {
        personIds: ['Cyril'],
        notInGroups: ['g1', 'g2']
    }
];

let apartConstraintsArray = [
    {
        personIds: ['Arnaud', 'Théophane']
    }
];

document.addEventListener('DOMContentLoaded', () => {
    let personIds = importPersonIds(personIdsArray);
    let groupSizes = importGroupSizes(groupsSizesObject);
    let history = importHistory(historyArray);
    let togetherConstraints = importConstraints(togetherConstraintsArray);
    let apartConstraints = importConstraints(apartConstraintsArray);

    let mm = new MemoMix(personIds, groupSizes, history, togetherConstraints, apartConstraints);
    let entry = mm.getNewEntry()
    console.log(toJson(entry));
});

/*
Possible output without constraints:
{
    '1': {'Timothé', 'Arnaud', 'Erwann'},
    '2': {'Théo', 'Théophane', 'Laurent'},
    '3': {'Cyril', 'François', 'Jean'}
}
*/









