export default function toSnakeCase(str) {
    return str
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')  // only insert _ at a case *boundary*
        .toLowerCase();
}