import pprint

from memomix import MemoMix

# taches de ménage, person: name, capacity

# tables mercredi soir
# person: id
# table: id

persons = {
    'Timothé',
    'François',
    'Laurent',
    'Théo',
    'Arnaud',
    'Jean',
    'Cyril',
    'Théophane',
    'Erwann',
}

# group_id -> capacity
groups_sizes = {
    'g1': 3,
    'g2': 3,
    'g3': 3
}

history = [
    {
        'g1': {'Timothé', 'François', 'Laurent'},
        'g2': {'Théo', 'Arnaud', 'Jean'},
        'g3': {'Cyril', 'Théophane', 'Erwann'}
    },
    {
        'g1': {'Timothé', 'Théophane', 'Jean'},
        'g2': {'Théo', 'François', 'Erwann'},
        'g3': {'Cyril', 'Arnaud', 'Laurent'}
    }
]

'''
Possible output without constraints:
{
    'g1': {'Timothé', 'Arnaud', 'Erwann'},
    'g2': {'Théo', 'Théophane', 'Laurent'},
    'g3': {'Cyril', 'François', 'Jean'}
}
'''


constraints = [
    {'type': 'together', 'persons': {'Timothé', 'François'}, 'mandatoryGroup': 'g1'},
    {'type': 'together', 'persons': {'Cyril'}, 'forbiddenGroups': {'g3'}},
    {'type': 'apart', 'persons': {'Arnaud', 'Théophane'}}
]

if __name__ == '__main__':
    mm = MemoMix(persons=persons, group_sizes=groups_sizes, history=history, constraints=constraints)
    bugs_mandatory_group = 0
    bugs_forbidden_groups = 0
    bugs_apart = 0
    '''
    for i in range(1000):
        entry = mm.generate_entry()
        for group_id, persons in entry.items():
            if group_id == 'g1' and ('Timothé' not in persons or 'François' not in persons):
                bugs_mandatory_group += 1
            if group_id == 'g2' and 'Cyril' in persons:
                bugs_forbidden_groups += 1
            if 'Arnaud' in persons and 'Théophane' in persons:
                bugs_apart += 1
    print('Bugs mandatory groups:', bugs_mandatory_group / 1000)
    print('Bugs forbidden groups:', bugs_forbidden_groups / 1000)
    print('Bugs apart:', bugs_apart / 1000)
    '''
    entry = mm.generate_entry()
    pprint.pp(entry)
