import pprint

from memomix import MemoMix

# taches de ménage, person: name, capacity

# tables mercredi soir
# person: id
# table: id

person_ids = {
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

'''
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
history = []

'''
Possible output without constraints:
{
    'g1': {'Timothé', 'Arnaud', 'Erwann'},
    'g2': {'Théo', 'Théophane', 'Laurent'},
    'g3': {'Cyril', 'François', 'Jean'}
}
'''


constraints = [
    {'type': 'together', 'personIds': {'Timothé', 'François'}, 'mandatoryGroup': 'g1'},
    {'type': 'together', 'personIds': {'Cyril'}, 'forbiddenGroups': {'g2'}},
    {'type': 'apart', 'personIds': {'Arnaud', 'Théophane'}}
]

if __name__ == '__main__':
    mm = MemoMix(person_ids=person_ids, group_sizes=groups_sizes, history=history, constraints=constraints)
    bugs_mandatory_group = 0
    bugs_forbidden_groups = 0
    bugs_apart = 0
    '''
    for i in range(1000):
        entry = mm.generate_entry()
        for group_id, person_ids in entry.items():
            if group_id == 'g1' and ('Timothé' not in person_ids or 'François' not in person_ids):
                bugs_mandatory_group += 1
            if group_id == 'g2' and 'Cyril' in person_ids:
                bugs_forbidden_groups += 1
            if 'Arnaud' in person_ids and 'Théophane' in person_ids:
                bugs_apart += 1
    print('Bugs mandatory groups:', bugs_mandatory_group / 1000)
    print('Bugs forbidden groups:', bugs_forbidden_groups / 1000)
    print('Bugs apart:', bugs_apart / 1000)
    '''
    entry = mm.generate_entry()
    pprint.pp(entry)
