import random
import json

# IDEAS:
# - attribute to prioritize new person-group pairings instead of new person-person pairings
# - check that each 'personId' of 'apart' constraints contains at least one element

# Note: It is important to lift the ambiguation when 2 different persons share the same ID in history and person_ids.
# For example, if the ID is the surname, add another letter in the ID for the last name.


class MemoMix:
    def __init__(
            self, person_ids: set, group_sizes: dict, history=None,
            together_constraints=None, apart_constraints=None
    ):
        """
        Constructor.

        :param person_ids: the set of person IDs
        :param group_sizes: the dictionary of group capacities
        :param history: the history of past entries
        :param together_constraints: the 'together' constraints
        :param apart_constraints: the 'apart' constraints
        """
        # fix mutable default parameters side effect
        if history is None:
            history = []
        if together_constraints is None:
            together_constraints = []
        if apart_constraints is None:
            apart_constraints = []

        assert len(person_ids) <= sum(group_sizes.values()), 'The groups cannot contain all the persons.'
        assert all([size >= 1 for size in group_sizes.values()]), 'At least one group has a negative or null size.'
        for entry in history:
            assert self.check_entry_validity(entry), 'Invalid entry.'

        self.person_ids = person_ids
        self.group_sizes = group_sizes
        self.history = history

        assert self.check_constraints_validity(together_constraints, apart_constraints), 'Invalid constraints.'
        self.together_constraints = together_constraints
        self.apart_constraints = apart_constraints

    def get_person_person_key(self, person1_id: str, person2_id: str):
        """
        Get a unique string from the 2 person IDs in a deterministic way.

        :param person1_id: the ID of the first person
        :param person2_id: the ID of the second person
        :return: the derived unique key
        """
        return json.dumps(sorted([person1_id, person2_id]))

    def get_person_group_key(self, person_id: str, group_id: str):
        """
        Get a unique string from the person and group IDs in a deterministic way.

        :param person_id: the ID of the person
        :param group_id: the ID of the group
        :return: the derived unique key
        """
        return json.dumps([person_id, group_id])

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
                    key = self.get_person_person_key(person1_id, person2_id)
                    person_occurrences_map[key] = {
                        'person1Id': person1_id,
                        'person2Id': person2_id,
                        'count': 0
                    }
            for group_id in self.group_sizes:
                key = self.get_person_group_key(person1_id, group_id)
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

    def initialize_entry(self, person_occurrences_map: dict, group_occurrences_map: dict):
        """
        Initialize a new entry using 'together' and 'apart' constraints.

        :param person_occurrences_map: the map of past person-person occurrences
        :param group_occurrences_map: the map of past person-group occurrences
        :return: a new initialized entry with the remaining person IDs to insert
        """
        entry = {}
        remaining_person_ids = self.person_ids.copy()
        # initialize the new entry with empty sets
        for group_id in self.group_sizes:
            entry[group_id] = set()
        # satisfy the constraints
        for constraint in self.constraints:
            constraint_type = constraint['type']
            person_ids = constraint['personIds']
            if constraint_type == 'apart':
                self.satisfy_apart_constraint(
                    person_ids=person_ids, entry=entry,
                    remaining_person_ids=remaining_person_ids,
                    person_occurrences_map=person_occurrences_map,
                    group_occurrences_map=group_occurrences_map
                )
            elif constraint_type == 'together':
                self.satisfy_together_constraint(
                    person_ids=person_ids, entry=entry,
                    remaining_person_ids=remaining_person_ids,
                    in_group=constraint.get('inGroup'),
                    not_in_groups=constraint.get('notInGroup'),
                    person_occurrences_map=person_occurrences_map,
                    group_occurrences_map=group_occurrences_map
                )
        return entry, remaining_person_ids

    def satisfy_apart_constraint(
        self, person_ids: set, entry: dict, remaining_person_ids: set, 
        person_occurrences_map: dict, group_occurrences_map: dict
    ):
        person_ids = list(person_ids)
        random.shuffle(person_ids)
        # IDs of groups that are not full
        available_group_ids = {
            group_id for group_id, group in entry.items()
            if len(group) < self.group_sizes[group_id]
        }
        # IDs of groups that are not empty nor full
        priority_group_ids = {group_id for group_id in available_group_ids if entry[group_id]}
        for person_id in person_ids:
            group_id = self.get_group_id(person_id, entry)
            # if the person is not already inserted
            if not group_id:
                # if there are still groups that are not empty nor full, use them in priority
                # so that people are less left alone
                if priority_group_ids:
                    best_group_ids = self.get_best_group_ids_by_person_occurrences(
                        person_ids={person_id}, entry=entry,
                        person_occurrences_map=person_occurrences_map,
                        candidate_group_ids=priority_group_ids
                    )
                    if len(best_group_ids) > 1:
                        best_group_ids = self.get_best_group_ids_by_group_occurrences(
                            person_ids={person_id}, entry=entry,
                            group_occurrences_map=group_occurrences_map,
                            candidate_group_ids=best_group_ids
                        )
                    group_id = random.choice(list(best_group_ids))
                    priority_group_ids.remove(group_id)
                else:
                    best_group_ids = self.get_best_group_ids_by_group_occurrences(
                        person_ids={person_id}, entry=entry,
                        group_occurrences_map=group_occurrences_map,
                        candidate_group_ids=available_group_ids
                    )
                    group_id = random.choice(list(best_group_ids))
                entry[group_id].add(person_id)
                remaining_person_ids.remove(person_id)
            available_group_ids.remove(group_id)
            # if there are no more groups to insert the person,
            # we cannot satisfy the constraint further
            if not available_group_ids:
                return
    
    def satisfy_together_constraint(
        self, person_ids: set, entry: dict, remaining_person_ids: set,
        in_group: str, not_in_groups: set,
        person_occurrences_map: dict, group_occurrences_map: dict
    ):
        person_ids = list(person_ids)
        random.shuffle(person_ids)
        already_used_group_ids = set()
        not_inserted_person_ids = []
        for person_id in person_ids:
            group_id = self.get_group_id(person_id, entry)
            if group_id:
                already_used_group_ids.add(group_id)
            else:
                not_inserted_person_ids.append(person_id)
        # if there are some groups where some of the persons of the constraint have already been inserted,
        # use them in priority
        if already_used_group_ids:
            for person_id in not_inserted_person_ids:
                best_group_ids = self.get_best_group_ids_by_person_occurrences(
                    person_ids={person_id}, entry=entry,
                    person_occurrences_map=person_occurrences_map,
                    candidate_group_ids=already_used_group_ids
                )
                if len(best_group_ids) > 1:
                    best_group_ids = self.get_best_group_ids_by_group_occurrences(
                        person_ids={person_id}, entry=entry,
                        group_occurrences_map=group_occurrences_map,
                        candidate_group_ids=best_group_ids
                    )
                # if there are no more groups to insert the person,
                # we cannot satisfy the constraint further
                if not best_group_ids:
                    return
                group_id = random.choice(list(best_group_ids))
                entry[group_id].add(person_id)
                remaining_person_ids.remove(person_id)
        else:
            # if a 'inGroup' rule has been specified
            if in_group:
                group_id = in_group
                for person_id in person_ids:
                    # if the group is full, we cannot satisfy the constraint further
                    if len(entry[group_id]) >= self.group_sizes[group_id]:
                        return
                    entry[group_id].add(person_id)
                    remaining_person_ids.remove(person_id)
            else:
                candidate_group_ids = set(self.group_sizes.keys())
                best_group_ids = {}
                while not best_group_ids:
                    # if a 'notInGroups' rule has been specified
                    if not_in_groups:
                        candidate_group_ids -= not_in_groups
                    best_group_ids = self.get_best_group_ids_by_group_occurrences(
                        person_ids=person_ids, entry=entry,
                        group_occurrences_map=group_occurrences_map,
                        candidate_group_ids=candidate_group_ids
                    )
                # TODO finish this part it's not good
                # there must be at least one group that can contain the person
                # otherwise the constraints are not satisfiable
                assert best_group_ids, 'Constraints not satisfiable.'
                group_id = random.choice(list(best_group_ids))
                entry[group_id].update(person_ids)
                remaining_person_ids -= person_ids

    def get_new_entry(self):
        """
        Generate a new possible entry that minimizes the redundancy of past pairings.

        :return: a new entry
        """
        # CAVEAT: Finding the group configuration that has the lowest redundancy is a NP-hard problem.
        # Hence, this is a heuristic algorithm, not an optimal one, that does no backtracking.

        # retrieve the maps
        pairing_counts_map, person_occurrences_map, group_occurrences_map = self.get_occurrences_maps()
        # initialize the new entry
        entry, remaining_person_ids = self.initialize_entry(
            person_occurrences_map=person_occurrences_map,
            group_occurrences_map=group_occurrences_map
        )
        # sort the person IDs according to their number of past pairings
        remaining_person_ids = list(remaining_person_ids)
        remaining_person_ids.sort(key=lambda person_id: pairing_counts_map[person_id])

        # sort the person-person pairings using 2 values:
        # - primary: number of occurrences where the 2 persons have been together
        # - secondary: minimum number of pairings for the 2 persons
        person_occurrences = sorted(
            person_occurrences_map.values(),
            key=lambda item: (
                item['count'],
                min(
                    pairing_counts_map[item['person1Id']],
                    pairing_counts_map[item['person2Id']]
                )
            )
        )

        # put in priority couples of persons who have been the least frequently together
        empty_group2_id = self.get_empty_group2_id(entry)
        while len(remaining_person_ids) >= 2 and empty_group2_id:
            person_occurrence = person_occurrences.pop(0)
            person1_id = person_occurrence['person1Id']
            person2_id = person_occurrence['person2Id']
            # if the two persons have not been already inserted
            if person1_id in remaining_person_ids and person2_id in remaining_person_ids:
                entry[empty_group2_id].update({person1_id, person2_id})
                remaining_person_ids.remove(person1_id)
                remaining_person_ids.remove(person2_id)
                empty_group2_id = self.get_empty_group2_id(entry)

        # if there are no more empty groups that can contain a couple
        # put the remaining persons in non-full and non-empty groups
        # in a way to minimize the average number of occurrences with other persons
        while self.contains_non_full_non_empty_group(entry) and remaining_person_ids:
            # get the person ID with the lowest number of past pairings
            person_id = remaining_person_ids.pop(0)
            # get the set of candidate group IDs
            best_group_ids = self.get_best_group_ids_by_person_occurrences(
                person_ids={person_id}, entry=entry,
                person_occurrences_map=person_occurrences_map
            )
            # if there is a tie
            if len(best_group_ids) > 1:
                best_group_ids = self.get_best_group_ids_by_group_occurrences(
                    person_ids={person_id}, entry=entry,
                    group_occurrences_map=group_occurrences_map,
                    candidate_group_ids=best_group_ids
                )
            # in case there is still a tie, choose randomly
            group_id = random.choice(list(best_group_ids))
            entry[group_id].add(person_id)

        # if there still remains non-inserted persons
        # insert them in the remaining empty groups
        # (if there was more than 1 person, the only remaining groups are of size 1)
        while remaining_person_ids:
            person_id = remaining_person_ids.pop(0)
            best_group_ids = self.get_best_group_ids_by_group_occurrences(
                person_ids={person_id}, entry=entry,
                group_occurrences_map=group_occurrences_map
            )
            # in case there is a tie, choose randomly
            group_id = random.choice(list(best_group_ids))
            entry[group_id].add(person_id)

        return entry

    def get_empty_group2_id(self, entry: dict):
        """
        Get the ID of the first largest empty group in the entry that can contain at least 2 persons.

        :param entry: the entry being constructed
        :return: the first group satisfying the conditions
        """
        sorted_groups = sorted(
            self.group_sizes.keys(), key=lambda group_id: self.group_sizes[group_id], reverse=True
        )
        for group_id in sorted_groups:
            if not entry[group_id] and self.group_sizes[group_id] >= 2:
                return group_id
        return None

    def contains_non_full_non_empty_group(self, entry: dict):
        """
        Tell if there is any non-full and non-empty group in the entry.

        :param entry: the entry being constructed
        :return: True if there is any group satisfying the conditions, False otherwise
        """
        for group_id, group in entry.items():
            if group and len(group) < self.group_sizes[group_id]:
                return True
        return False

    def get_group_id(self, person_id, entry):
        """
        Get the group ID of where the person is, or None if the person is not found.

        :param person_id: the ID of the person to find
        :param entry: the entry being constructed
        :return: the ID of the group where the person is, or None if the person is not found
        """
        for group_id, group in entry.items():
            if person_id in group:
                return group_id
        return None

    def get_best_group_ids_by_person_occurrences(
            self, person_ids: set, entry: dict, person_occurrences_map: dict, candidate_group_ids=None
    ):
        """
        Get the IDs of the groups which minimize the redundancy of past person-person pairings.

        :param person_ids: the set of IDs of the persons to insert
        :param entry: the entry being constructed
        :param person_occurrences_map: the map of past person-person occurrences
        :param candidate_group_ids: the set of candidate group IDs
        :return: the set of group IDs satisfying the conditions
        """
        # if no candidate group IDs were given
        # or at least one candidate group ID does not exist
        # then all group IDs are candidates
        all_group_ids = set(self.group_sizes.keys())
        if not candidate_group_ids or not candidate_group_ids.issubset(all_group_ids):
            candidate_group_ids = all_group_ids
        # the IDs of the groups which are not empty and that can contain the subgroup
        # (the group must be non-empty for the average of occurrences to be calculated)
        candidate_group_ids = set(filter(
            lambda group_id:
                entry[group_id] and len(entry[group_id]) + len(person_ids) <= self.group_sizes[group_id],
            candidate_group_ids
        ))
        # if no group ID was found
        if not candidate_group_ids:
            return set()
        # the dictionary giving for each candidate group ID
        # the associated list of occurrences of each person of the subgroup to insert
        # with all the persons in the current group
        person_occurrences_for_subgroup = {}
        for group_id in candidate_group_ids:
            person_occurrences_for_subgroup[group_id] = []
            for person1_id in person_ids:
                for person2_id in entry[group_id]:
                    key = self.get_person_person_key(person1_id, person2_id)
                    person_occurrences_for_subgroup[group_id].append(person_occurrences_map[key]['count'])
        # the minimum average of occurrences of all the persons of the subgroup
        # with any group of persons in the entry
        min_person_occurrences_average = min([
            sum(person_occurrences_for_subgroup[group_id]) / len(person_occurrences_for_subgroup[group_id])
            for group_id in candidate_group_ids
        ])
        # the IDs of the groups of persons having the minimum average of occurrences with the subgroup
        candidate_group_ids = set(filter(
            lambda group_id:
                sum(person_occurrences_for_subgroup[group_id]) / len(person_occurrences_for_subgroup[group_id])
                == min_person_occurrences_average,
            candidate_group_ids
        ))
        return candidate_group_ids

    def get_best_group_ids_by_group_occurrences(
            self, person_ids: set, entry: dict, group_occurrences_map: dict, candidate_group_ids=None
    ):
        """
        Get the IDs of the groups which minimize the redundancy of past person-group pairings.

        :param person_ids: the set of IDs of the persons to insert
        :param entry: the entry being constructed
        :param group_occurrences_map: the map of past person-group occurrences
        :param candidate_group_ids: the set of candidate group IDs
        :return: the set of group IDs satisfying the conditions
        """
        # if no candidate group IDs were given
        # or at least one candidate group ID does not exist
        # then all group IDs are candidates
        all_group_ids = set(self.group_sizes.keys())
        if not candidate_group_ids or not candidate_group_ids.issubset(all_group_ids):
            candidate_group_ids = all_group_ids
        # the IDs of the groups that can contain the subgroup
        candidate_group_ids = set(filter(
            lambda group_id:
                len(entry[group_id]) + len(person_ids) <= self.group_sizes[group_id],
            candidate_group_ids
        ))
        # if no group ID was found
        if not candidate_group_ids:
            return set()
        # the dictionary giving for each candidate group ID
        # the associated list of occurrences of each person with the group
        group_occurrences_for_subgroup = {
            group_id: [
                group_occurrences_map[self.get_person_group_key(person_id, group_id)]['count']
                for person_id in person_ids
            ]
            for group_id in candidate_group_ids
        }
        # the minimum average of occurrences of any person in the subgroup with any of the candidate groups
        min_group_occurrences_average = min([
            sum(group_occurrences_for_subgroup[group_id]) / len(group_occurrences_for_subgroup[group_id])
            for group_id in candidate_group_ids
        ])
        # the IDs of the candidate groups which have the minimum number of occurrences with the person
        candidate_group_ids = set(filter(
            lambda group_id:
                sum(group_occurrences_for_subgroup[group_id]) / len(group_occurrences_for_subgroup[group_id])
                == min_group_occurrences_average,
            candidate_group_ids
        ))
        # the maximum group size in the candidate groups
        max_group_size = max([
            self.group_sizes[group_id] for group_id in candidate_group_ids
        ])
        # the IDs of the filtered groups which have the maximum size
        candidate_group_ids = set(filter(
            lambda group_id: self.group_sizes[group_id] == max_group_size,
            candidate_group_ids
        ))
        return candidate_group_ids

    def check_constraints_validity(self, together_constraints: list, apart_constraints: list):
        """
        Check that the constraints are valid.

        :param together_constraints: the 'together' constraints
        :param apart_constraints: the 'apart' constraints
        :return: True if the constraints are valid, False otherwise
        """
        # check that all person and group IDs are valid
        if together_constraints:
            group_ids = set(self.group_sizes.keys())
            for constraint in together_constraints:
                person_ids = constraint['personIds']
                for person_id in person_ids:
                    # if any of the person IDs does not exist
                    if person_id not in self.person_ids:
                        return False
                # if the 'inGroup' ID does not exist
                if 'inGroup' in constraint and constraint['inGroup'] not in group_ids:
                    return False
                if 'notInGroups' in constraint:
                    forbidden_group_ids = constraint['notInGroups']
                    # if all the group IDs are forbidden
                    if not group_ids - forbidden_group_ids:
                        return False
        if apart_constraints:
            for constraint in apart_constraints:
                person_ids = constraint['personIds']
                for person_id in person_ids:
                    # if any of the person IDs does not exist
                    if person_id not in self.person_ids:
                        return False
        # TODO: check that group can contain all subgroups for 'in'
        # for the time being, do not perform further checks
        # as inconsistent constraints do not induce errors
        return True

    def check_entry_validity(self, entry: dict):
        """
        Check that all person IDs appear only once in the entry.

        :param entry: the entry to check
        :return: True if the entry is valid, False otherwise
        """
        person_ids = set()
        for group in entry.values():
            for person_id in group:
                if person_id in person_ids:
                    return False
                person_ids.add(person_id)
        return True

    def save_entry(self, entry: dict):
        """
        Save the entry in the history.

        :param entry: the entry to save
        """
        assert self.check_entry_validity(entry), 'Invalid entry.'
        self.history.append(entry)
