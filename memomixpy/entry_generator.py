from util import get_person_person_key, get_person_group_key, random_shuffle, random_choice

class EntryGenerator:
    def __init__(
        self, person_ids: set, group_sizes: dict,
        pairing_counts_map: dict, person_occurrences_map: dict, group_occurrences_map: dict,
        constraints: list
    ):
        self.person_ids = person_ids
        self.group_sizes = group_sizes
        self.pairing_counts_map = pairing_counts_map
        self.person_occurrences_map = person_occurrences_map
        self.group_occurrences_map = group_occurrences_map
        self.constraints = constraints

        self.remaining_person_ids = self.person_ids.copy()
        self.entry = {}
        # initialize the new entry with empty sets
        for group_id in self.group_sizes:
            self.entry[group_id] = set()
    
    def generate_entry(self):
        """
        Generate a new possible entry that satisfies the constraints
        and minimizes the redundancy of past pairings.

        :return: a new entry
        """
        # satisfy the constraints according to their priority (i.e. index in the list)
        for constraint in self.constraints:
            constraint_type = constraint['type']
            person_ids = constraint['personIds']
            if constraint_type == 'apart':
                self.satisfy_apart_constraint(person_ids=person_ids)
            elif constraint_type == 'together':
                self.satisfy_together_constraint(
                    person_ids=person_ids,
                    mandatory_group_id=constraint.get('mandatoryGroup'),
                    forbidden_group_ids=constraint.get('forbiddenGroups')
                )
        # insert couples of persons who have been the least frequently together
        self.insert_couples_with_least_occurrences()
        # if there are no more empty groups that can contain a couple
        # insert the remaining persons
        self.insert_remaining_persons()
        return self.entry

    def satisfy_apart_constraint(self, person_ids: set):
        sorted_person_ids = sorted(
            random_shuffle(person_ids),
            key=lambda person_id: self.pairing_counts_map[person_id]
        )
        # IDs of groups that are not full
        available_group_ids = {
            group_id for group_id, person_ids in self.entry.items()
            if len(person_ids) < self.group_sizes[group_id]
        }
        # IDs of groups that are not empty nor full
        priority_group_ids = {
            group_id for group_id in available_group_ids
            if self.entry[group_id]
        }
        for person_id in sorted_person_ids:
            group_id = self.get_group_id(person_id)
            # if the person is not already inserted
            if not group_id:
                # if there are still groups that are not empty nor full, use them in priority
                # so that people are less left alone
                if priority_group_ids:
                    best_group_ids = self.get_best_group_ids_by_person_occurrences(
                        person_ids={person_id}, candidate_group_ids=priority_group_ids
                    )
                    if len(best_group_ids) > 1:
                        best_group_ids = self.get_best_group_ids_by_group_occurrences(
                            person_ids={person_id}, candidate_group_ids=best_group_ids
                        )
                    group_id = random_choice(best_group_ids)
                    priority_group_ids.remove(group_id)
                else:
                    best_group_ids = self.get_best_group_ids_by_group_occurrences(
                        person_ids={person_id}, candidate_group_ids=available_group_ids
                    )
                    group_id = random_choice(best_group_ids)
                self.entry[group_id].add(person_id)
                self.remaining_person_ids.remove(person_id)
            available_group_ids.remove(group_id)
            # if there are no more groups to insert the person,
            # we cannot satisfy the constraint further
            if not available_group_ids:
                return
    
    def satisfy_together_constraint(self, person_ids: set, mandatory_group_id: str=None, forbidden_group_ids: set=None):
        sorted_person_ids = sorted(
            random_shuffle(person_ids),
            key=lambda person_id: self.pairing_counts_map[person_id]
        )
        already_used_group_ids = set()
        not_inserted_person_ids = []
        for person_id in sorted_person_ids:
            group_id = self.get_group_id(person_id)
            if group_id:
                already_used_group_ids.add(group_id)
            else:
                not_inserted_person_ids.append(person_id)
        # if there are some groups where some of the persons of the constraint have already been inserted,
        # use them in priority
        if already_used_group_ids:
            for person_id in not_inserted_person_ids:
                best_group_ids = self.get_best_group_ids_by_person_occurrences(
                    person_ids={person_id}, candidate_group_ids=already_used_group_ids
                )
                # if there are still groups to insert the person
                if best_group_ids:
                    if len(best_group_ids) > 1:
                        best_group_ids = self.get_best_group_ids_by_group_occurrences(
                            person_ids={person_id}, candidate_group_ids=best_group_ids
                        )
                    group_id = random_choice(best_group_ids)
                    self.entry[group_id].add(person_id)
                    self.remaining_person_ids.remove(person_id)
        else:
            # if there is a mandatory group
            if mandatory_group_id:
                for person_id in sorted_person_ids:
                    # if the group is not full
                    if len(self.entry[mandatory_group_id]) < self.group_sizes[mandatory_group_id]:
                        self.entry[mandatory_group_id].add(person_id)
                        self.remaining_person_ids.remove(person_id)
            else:
                candidate_group_ids = set(self.group_sizes.keys())
                # if there are forbidden groups
                if forbidden_group_ids:
                    candidate_group_ids -= forbidden_group_ids
                best_group_ids = set()
                while not best_group_ids:
                    best_group_ids = self.get_best_group_ids_by_person_occurrences(
                        person_ids=set(sorted_person_ids), candidate_group_ids=candidate_group_ids
                    )
                    if not best_group_ids:
                        best_group_ids = self.get_best_group_ids_by_group_occurrences(
                            person_ids=set(sorted_person_ids), candidate_group_ids=candidate_group_ids
                        )
                        if not best_group_ids:
                            sorted_person_ids.pop()
                    elif len(best_group_ids) > 1:
                        best_group_ids = self.get_best_group_ids_by_group_occurrences(
                            person_ids=best_group_ids, candidate_group_ids=candidate_group_ids
                        )
                group_id = random_choice(best_group_ids)
                person_ids = set(sorted_person_ids)
                self.entry[group_id].update(person_ids)
                self.remaining_person_ids -= person_ids

    def insert_couples_with_least_occurrences(self):
        # sort the person-person pairings using 2 keys:
        # - primary: number of occurrences where the 2 persons have been together
        # - secondary: minimum number of pairings for the 2 persons
        sorted_person_occurrences = sorted(
            random_shuffle(self.person_occurrences_map.values()),
            key=lambda item: (
                item['count'],
                min(
                    self.pairing_counts_map[item['person1Id']],
                    self.pairing_counts_map[item['person2Id']]
                )
            )
        )

        empty_group_ids = {
            group_id for group_id in self.group_sizes.keys()
            if not self.entry[group_id]
        }
        # insert in empty groups couples of persons who have been the least frequently together
        while len(self.remaining_person_ids) >= 2:
            person_occurrence = sorted_person_occurrences.pop(0)
            person1_id = person_occurrence['person1Id']
            person2_id = person_occurrence['person2Id']
            # if the two persons have not been already inserted
            if person1_id in self.remaining_person_ids and person2_id in self.remaining_person_ids:
                person_ids = {person1_id, person2_id}
                best_group_ids = self.get_best_group_ids_by_group_occurrences(
                    person_ids=person_ids, candidate_group_ids=empty_group_ids
                )
                if not best_group_ids:
                    return
                group_id = random_choice(best_group_ids)
                self.entry[group_id].update(person_ids)
                self.remaining_person_ids.remove(person1_id)
                self.remaining_person_ids.remove(person2_id)
                empty_group_ids.remove(group_id)

    def insert_remaining_persons(self):
        # sort the person IDs according to their number of past pairings
        sorted_remaining_person_ids = sorted(
            random_shuffle(self.remaining_person_ids),
            key=lambda person_id: self.pairing_counts_map[person_id]
        )

        # put the remaining persons in non-full and non-empty groups
        # in a way to minimize the average number of occurrences with other persons
        while sorted_remaining_person_ids:
            # get the person ID with the lowest number of past pairings
            person_id = sorted_remaining_person_ids.pop(0)
            # get the set of candidate group IDs
            best_group_ids = self.get_best_group_ids_by_person_occurrences(person_ids={person_id})
            # if there is a tie
            if len(best_group_ids) > 1:
                best_group_ids = self.get_best_group_ids_by_group_occurrences(
                    person_ids={person_id}, candidate_group_ids=best_group_ids
                )
            # in case there is still a tie, choose randomly
            group_id = random_choice(best_group_ids)
            self.entry[group_id].add(person_id)

        # if there still remains non-inserted persons
        # insert them in the remaining empty groups, i.e. groups of size 1
        # (unless there was only 1 person to insert to begin with)
        while sorted_remaining_person_ids:
            person_id = sorted_remaining_person_ids.pop(0)
            best_group_ids = self.get_best_group_ids_by_group_occurrences(person_ids={person_id})
            # in case there is a tie, choose randomly
            group_id = random_choice(best_group_ids)
            entry[group_id].add(person_id)

    def get_group_id(self, person_id):
        """
        Get the group ID of where the person is in the entry, or None if the person is not found.

        :param person_id: the ID of the person to find
        :return: the ID of the group where the person is, or None if the person is not found
        """
        for group_id, group in self.entry.items():
            if person_id in group:
                return group_id
        return None

    def get_best_group_ids_by_person_occurrences(self, person_ids: set, candidate_group_ids=None):
        """
        Get the IDs of the groups which minimize the redundancy of past person-person pairings.

        :param person_ids: the set of IDs of the persons to insert
        :param candidate_group_ids: the set of candidate group IDs
        :return: the set of group IDs satisfying the conditions
        """
        # if no candidate group IDs were given
        # or at least one candidate group ID does not exist
        # then all group IDs are candidates
        all_group_ids = set(self.group_sizes.keys())
        if candidate_group_ids is None or not candidate_group_ids.issubset(all_group_ids):
            candidate_group_ids = all_group_ids
        # the IDs of the groups which are not empty and that can contain the subgroup
        # (the group must be non-empty for the average of occurrences to be calculated)
        candidate_group_ids = set(filter(
            lambda group_id:
                self.entry[group_id] and len(self.entry[group_id]) + len(person_ids) <= self.group_sizes[group_id],
            candidate_group_ids
        ))
        # if no group ID was found
        if not candidate_group_ids:
            return set()
        # the dictionary giving for each candidate group ID
        # the associated list of occurrences of each person to insert
        # with all the persons in the group
        person_occurrences_for_subgroup = {}
        for group_id in candidate_group_ids:
            person_occurrences_for_subgroup[group_id] = []
            for person1_id in person_ids:
                for person2_id in self.entry[group_id]:
                    key = get_person_person_key(person1_id, person2_id)
                    person_occurrences_for_subgroup[group_id].append(self.person_occurrences_map[key]['count'])
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

    def get_best_group_ids_by_group_occurrences(self, person_ids: set, candidate_group_ids=None):
        """
        Get the IDs of the groups which minimize the redundancy of past person-group pairings.

        :param person_ids: the set of IDs of the persons to insert
        :param candidate_group_ids: the set of candidate group IDs
        :return: the set of group IDs satisfying the conditions
        """
        # if no candidate group IDs were given
        # or at least one candidate group ID does not exist
        # then all group IDs are candidates
        all_group_ids = set(self.group_sizes.keys())
        if candidate_group_ids is None or not candidate_group_ids.issubset(all_group_ids):
            candidate_group_ids = all_group_ids
        # the IDs of the groups that can contain the persons to insert
        candidate_group_ids = set(filter(
            lambda group_id:
                len(self.entry[group_id]) + len(person_ids) <= self.group_sizes[group_id],
            candidate_group_ids
        ))
        # if no group ID was found
        if not candidate_group_ids:
            return set()
        # the dictionary giving for each candidate group ID
        # the associated list of occurrences of each person to insert with the group
        group_occurrences_for_subgroup = {
            group_id: [
                self.group_occurrences_map[get_person_group_key(person_id, group_id)]['count']
                for person_id in person_ids
            ]
            for group_id in candidate_group_ids
        }
        # the minimum average of occurrences of any person to insert with any of the candidate groups
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
