import random
import json

def get_person_person_key(person1_id: str, person2_id: str):
    """
    Get a unique string from the 2 person IDs in a deterministic way.

    :param person1_id: the ID of the first person
    :param person2_id: the ID of the second person
    :return: the derived unique key
    """
    return json.dumps(sorted([person1_id, person2_id]))

def get_person_group_key(person_id: str, group_id: str):
    """
    Get a unique string from the person and group IDs in a deterministic way.

    :param person_id: the ID of the person
    :param group_id: the ID of the group
    :return: the derived unique key
    """
    return json.dumps([person_id, group_id])

def random_shuffle(iter):
    lst = list(iter)
    random.shuffle(lst)
    return lst

def random_choice(iter):
    return random.choice(list(iter))

