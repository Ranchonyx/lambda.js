export default class Environment {
    constructor(parent) {
        this.vars = Object.create(parent ? parent.vars : null);
        this.parent = parent;
    }

    extend = () => new Environment(this);
    lookup = (name) => {
        let scope = this;
        while (scope) {
            if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
                return scope;
            }
            scope = scope.parent;
        }
    }

    get = (name) => {
        if (name in this.vars) {
            return this.vars[name];
        }
        throw new Error(`Symbol \"${name}\" is undefined.`);
    }

    set = (name, value) => {
        let scope = this.lookup(name);
        if (!scope && this.parent)
            throw new Error(`Symbol \"${name}\" is undefined.`);
        return (scope || this).vars[name] = value;
    }

    def = (name, value) => this.vars[name] = value
}