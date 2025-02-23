from collections import deque
import heapq

class Step:
    def __init__(self, name, duration, step_type, predecessors):
        """
        Initialize a recipe step.
        
        :param name: str, unique name of the step
        :param duration: int, time required to complete the step
        :param step_type: str, type of step ('passive', 'partial', 'active')
        :param predecessors: list[str], names of steps that must complete before this step
        """
        self.name = name
        self.duration = duration
        self.step_type = step_type
        self.predecessors = predecessors

def recipe_topo_sort(steps, M):
    """
    Schedule recipe steps respecting dependencies and step type constraints.
    
    :param steps: dict[str, Step], mapping of step names to Step objects
    :param M: int, maximum number of partial steps that can run concurrently
    :return: list[str], ordered list of step names by start time
    """
    # Build successors dictionary: for each step, list of steps that depend on it
    successors = {name: [] for name in steps}
    for name, step in steps.items():
        for pred in step.predecessors:
            successors[pred].append(name)
    
    # Compute in-degrees: number of predecessors for each step
    in_degrees = {name: len(step.predecessors) for name, step in steps.items()}
    
    # Initialize queue with steps that have no predecessors (in-degree 0)
    queue = deque([name for name in steps if in_degrees[name] == 0])
    topo_order = []
    
    # Perform topological sort using Kahn's algorithm
    while queue:
        current = queue.popleft()
        topo_order.append(current)
        for successor in successors[current]:
            in_degrees[successor] -= 1
            if in_degrees[successor] == 0:
                queue.append(successor)
    
    # Schedule the steps
    active_avail = 0  # Time when the active slot is next available
    partial_slots = [0] * M  # Min-heap of times when partial slots are available
    heapq.heapify(partial_slots)
    start_times = {}  # Mapping of step names to start times
    finish_times = {}  # Mapping of step names to finish times
    
    for name in topo_order:
        step = steps[name]
        # Compute dependency time: latest finish time of predecessors
        dep_time = max((finish_times[pred] for pred in step.predecessors), default=0)
        
        if step.step_type == 'passive':
            # Passive steps can start immediately after predecessors
            start_time = dep_time
        elif step.step_type == 'active':
            # Active steps need the active slot; only one can run at a time
            start_time = max(dep_time, active_avail)
            active_avail = start_time + step.duration
        elif step.step_type == 'partial':
            # Partial steps need an available partial slot; at most M can run concurrently
            min_slot_time = heapq.heappop(partial_slots)
            start_time = max(dep_time, min_slot_time)
            heapq.heappush(partial_slots, start_time + step.duration)
        
        finish_time = start_time + step.duration
        start_times[name] = start_time
        finish_times[name] = finish_time
    # Sort steps by start time; stable sort preserves topological order for ties
    sorted_steps = sorted(topo_order, key=lambda name: start_times[name])
    return [(steps[name].name, start_times[name], finish_times[name]) for name in sorted_steps]

if __name__ == "__main__":
    steps = {
        1: Step("Chop onion for marinade", 5, "active", []),
        2: Step("Peel and crush garlic cloves", 3, "active", []),
        3: Step("Mix wine with chopped onion, crushed garlic, bay leaves, and peppercorns", 2, "active", [1, 2]),
        4: Step("Marinate beef in wine mixture", 240, "passive", [3]),
        5: Step("Preheat oven to 350°F", 10, "passive", []),
        6: Step("Remove meat from marinade and pat dry (reserve marinade)", 5, "active", [4]),
        7: Step("Prepare flour mixture with salt and pepper", 2, "active", []),
        8: Step("Coat beef cubes in flour mixture", 5, "active", [6, 7]),
        9: Step("Cut bacon into pieces", 3, "active", []),
        10: Step("Peel pearl onions", 8, "active", []),
        11: Step("Peel and cube carrots", 7, "active", []),
        12: Step("Fry bacon in olive oil", 8, "partial", [9]),
        13: Step("Transfer bacon to casserole", 1, "active", [12]),
        14: Step("Brown pearl onions and carrots", 10, "partial", [10, 11, 13]),
        15: Step("Transfer vegetables to casserole", 1, "active", [14]),
        16: Step("Brown meat in batches", 15, "partial", [8, 15]),
        17: Step("Add remaining flour to pan and brown", 3, "partial", [16]),
        18: Step("Add reserved marinade to pan and reduce", 10, "partial", [17]),
        19: Step("Add beef broth and tomato paste", 2, "active", [18]),
        20: Step("Combine all ingredients in casserole", 3, "active", [16, 19]),
        21: Step("Cook in oven", 120, "passive", [5, 20])
    }
    print(recipe_topo_sort(steps, 2))