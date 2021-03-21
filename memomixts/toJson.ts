type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type Struct = Json | Struct[] | { [key: string]: Struct } | Map<string, Struct> | Set<Struct>;

function isJson(test: any): test is Json {
    if (test == null || ['string', 'number', 'boolean'].indexOf(typeof test) != -1)
        return true;
    if (Array.isArray(test)) {
        // if at least one of the values is not JSON serializable, the array is not JSON-serializable
        for (let value of test)
            if (!isJson(value))
                return false;
        return true;
    }
    if (typeof test == 'object') {
        // if it is not a plain object, the object is not JSON-serializable
        if (Object.getPrototypeOf(test) != null && test.constructor != Object)
            return false;
        // if there are symbol properties, the object is not JSON-serializable
        if (Object.getOwnPropertySymbols(test).length > 0)
            return false;
        // if at least one of the values is not JSON serializable, the object is not JSON-serializable
        for (let [key, value] of Object.entries(test))
            if (!isJson(test[key]))
                return false;
        return true;
    }
    return false;
}

function toJson(struct: Struct) {
    let json: Json = null;
    if (isJson(struct))
        json = struct;
    else if (Array.isArray(struct) || struct instanceof Set) {
        json = [];
        let structCast = struct instanceof Set ? struct as Set<Struct> : struct as Struct[];
        for (let value of structCast)
            json.push(toJson(value));
    }
    else if (Object.getPrototypeOf(struct) == null || struct.constructor == Object || struct instanceof Map) {
        json = {};
        let structCast = struct instanceof Map ? struct as Map<string, Struct> : Object.entries(struct);
        for (let [key, value] of structCast)
            json[key] = toJson(value);
    }
    return json;
}
