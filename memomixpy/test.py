import pprint

from helloworld.python.memomix import MemoMix

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

together_constraints = [
    {
        'personIds': {'Timothé', 'François'},
        'inGroup': 'g1'
    },
    {
        'personIds': {'Cyril'},
        'notInGroups': {'g1', 'g2'}
    }
]

apart_constraints = [
    {
        'personIds': {'Arnaud', 'Théophane'}
    }
]

if __name__ == '__main__':
    mm = MemoMix(
        person_ids=person_ids, group_sizes=groups_sizes, history=history,
        together_constraints=together_constraints, apart_constraints=apart_constraints
    )
    entry = mm.get_new_entry()
    pprint.pp(entry)
