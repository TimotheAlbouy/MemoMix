from entry_generator import EntryGenerator
from util import get_person_person_key, get_person_group_key

# IDEAS:
# - attribute to prioritize new person-group pairings instead of new person-person pairings
# - check that each 'personId' of 'apart' constraints contains at least one element

# Note: It is important to lift the ambiguation when 2 different persons share the same ID in history and person_ids.
# For example, if the ID is the surname, add another letter in the ID for the last name.

# CAVEAT: Finding the group configuration that has the lowest redundancy is a NP-hard problem.
# Hence, this is a heuristic algorithm, not an optimal one, that does no backtracking.

class MemoMix:
    def __init__(self, person_ids: set, group_sizes: dict, history=None, constraints=None):
        """
        Constructor.

        :param person_ids: the set of person IDs
        :param group_sizes: the dictionary of group capacities
        :param history: the history of past entries
        :param constraints: the list of constraints
        """
        # fix mutable default parameters side effect
        if history is None:
            history = []
        if constraints is None:
            constraints = []

        self.check_positive_group_sizes(group_sizes)
        self.check_sufficient_group_sizes(person_ids, group_sizes)
        for entry in history:
            self.check_entry_validity(entry)

        self.person_ids = person_ids
        self.group_sizes = group_sizes
        self.history = history

        self.check_constraints_validity(constraints)
        self.constraints = constraints

    def get_occurrences_maps(self):
        """
        Get 3 maps containing respectively:
        - the count, for each person, of past pairings with other persons,
        - the count of occurrences of past person-person pairings,
        - the count of occurrences of past person-group pairings.

        :return: the 3 dictionaries
        """
        # initialize the maps with zeros
        pairing_counts_map = {}
        person_occurrences_map = {}
        group_occurrences_map = {}
        person_ids = list(self.person_ids)
        for idx, person1_id in enumerate(person_ids):
            pairing_counts_map[person1_id] = 0
            for person2_id in person_ids[idx + 1:]:
                if person1_id != person2_id:
                    key = get_person_person_key(person1_id, person2_id)
                    person_occurrences_map[key] = {
                        'person1Id': person1_id,
                        'person2Id': person2_id,
                        'count': 0
                    }
            for group_id in self.group_sizes:
                key = get_person_group_key(person1_id, group_id)
                group_occurrences_map[key] = {
                    'personId': person1_id,
                    'groupId': group_id,
                    'count': 0
                }

        # count the number of occurrences of past person-person and person-group pairings
        for entry in self.history:
            for group_id, group in entry.items():
                group = list(group)
                for idx, person1_id in enumerate(group):
                    pairing_counts_map[person1_id] += len(group) - 1
                    for person2_id in group[idx + 1:]:
                        if person1_id in self.person_ids and person2_id in self.person_ids:
                            key = self.get_person_person_key(person1_id, person2_id)
                            person_occurrences_map[key]['count'] += 1

                    key = self.get_person_group_key(person1_id, group_id)
                    group_occurrences_map[key]['count'] += 1

        return pairing_counts_map, person_occurrences_map, group_occurrences_map

    def generate_entry(self):
        """
        Generate a new possible entry that satisfies the constraints
        and minimizes the redundancy of past pairings.

        :return: a new entry
        """
        pairing_counts_map, person_occurrences_map, group_occurrences_map = self.get_occurrences_maps()
        generator = EntryGenerator(
            person_ids=self.person_ids, group_sizes=self.group_sizes,
            pairing_counts_map=pairing_counts_map,
            person_occurrences_map=person_occurrences_map,
            group_occurrences_map=group_occurrences_map,
            constraints=self.constraints
        )
        return generator.generate_entry()

    # ------------------------ GUARDS ------------------------ #

    def check_positive_group_sizes(self, group_sizes: dict):
        assert all([size >= 1 for size in group_sizes.values()]), \
            'At least one group has a negative or null size.'
    
    def check_sufficient_group_sizes(self, person_ids: set=None, group_sizes: dict=None):
        if not person_ids:
            person_ids = self.person_ids
        if not group_sizes:
            group_sizes = self.group_sizes
        assert len(person_ids) <= sum(group_sizes.values()), \
            'The groups cannot contain all the persons.'

    def check_constraints_validity(self, constraints: list):
        """
        Check that the constraints are valid.

        :param constraints: the constraints to check
        :return: True if the constraints are valid, False otherwise
        """
        group_ids = set(self.group_sizes.keys())
        for index, constraint in enumerate(constraints):
            person_ids = constraint['personIds']
            for person_id in person_ids:
                assert person_id in self.person_ids, \
                    f"The person '{person_id}' in constraint #{index} does not exist."
            mandatory_group_id = constraint.get('mandatoryGroup')
            forbidden_group_ids = constraint.get('forbiddenGroups')
            if mandatory_group_id:
                assert mandatory_group_id in group_ids, \
                    f"The mandatory group '{mandatory_group_id}' in constraint #{index+1} does not exist."
            if forbidden_group_ids:
                for forbidden_group_id in forbidden_group_ids:
                    assert forbidden_group_id in group_ids, \
                        f"The forbidden group '{forbidden_group_id}' in constraint #{index+1} does not exist."

    def check_entry_validity(self, entry: dict):
        """
        Check that all person IDs appear only once in the entry.

        :param entry: the entry to check
        :return: True if the entry is valid, False otherwise
        """
        used_person_ids = set()
        for group in entry.values():
            for person_id in group:
                assert person_id not in used_person_ids, \
                    f"The person '{person_id}' appears more than once in the entry."
                used_person_ids.add(person_id)
        return True
    
    # ------------------------ SETTERS ------------------------ #

    def set_person_ids(self, person_ids: set):
        """
        Change the set of person IDs.

        :param person_ids: the new set
        """
        self.check_sufficient_group_sizes(person_ids)
        self.person_ids = person_ids

    def set_group_sizes(self, group_sizes: dict):
        """
        Change the dictionary of group capacities.

        :param group_sizes: the new dictionary
        """
        self.check_positive_group_sizes(group_sizes) 
        self.check_sufficient_group_sizes(group_sizes=group_sizes)
        self.group_sizes = group_sizes

    def set_constraints(self, constraints: list):
        """
        Change the list of constraints.

        :param constraints: the new constraints
        """
        self.check_constraints_validity(together_constraints, apart_constraints)
        self.constraints = constraints
    
    def save_entry(self, entry: dict):
        """
        Save the entry in the history.

        :param entry: the entry to save
        """
        self.check_entry_validity(entry)
        self.history.append(entry)
