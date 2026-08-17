/**
 * YAML.
 *
 * The vendor boundary for `yaml`: the developer-tools panel is the only place
 * that needs it, and routing it through here keeps the package name out of the
 * feature code and lets an upgrade touch one file.
 *
 * Its own chunk by virtue of being reached only from the tools panel, which is
 * opened on demand.
 */
export { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
