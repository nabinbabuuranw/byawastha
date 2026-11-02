// Role-based access control, shared by the API (enforcement) and the UI (hiding what you can't do).
// The API is the only enforcer: the UI's checks are convenience.
import { getModule } from './registry.ts';

export const MODULE_ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'import'] as const;
export type ModuleAction = (typeof MODULE_ACTIONS)[number];
export const ORG_PERMS = ['org.settings', 'members.manage', 'roles.manage', 'modules.manage', 'audit.view', 'reports.view'] as const;
export type OrgPerm = (typeof ORG_PERMS)[number];

export interface RoleSpec {
  key: string; name: string; description: string; system: boolean;
  org: OrgPerm[];
  // default actions for every module, then per-category overrides
  modules: { default: ModuleAction[]; categories?: Record<string, ModuleAction[]> };
  ownOnly?: boolean; // sees only records they created (portal roles)
}
const ALL: ModuleAction[] = [...MODULE_ACTIONS];
const RW: ModuleAction[] = ['view', 'create', 'edit', 'export', 'import'];
export const SYSTEM_ROLES: RoleSpec[] = [
  { key: 'owner', name: 'Organization Owner', description: 'Everything, including deleting data and managing admins.', system: true, org: [...ORG_PERMS], modules: { default: ALL } },
  { key: 'admin', name: 'Organization Admin', description: 'Runs the workspace: members, roles, modules, all data.', system: true, org: [...ORG_PERMS], modules: { default: ALL } },
  { key: 'manager', name: 'Manager', description: 'Works with all module data; no delete, no member admin.', system: true, org: ['reports.view', 'audit.view'], modules: { default: RW } },
  { key: 'dept_head', name: 'Department Head', description: 'Full data access for their teams, reports and audit view.', system: true, org: ['reports.view', 'audit.view'], modules: { default: [...RW, 'delete'] } },
  { key: 'accountant', name: 'Accountant', description: 'Full access to Finance modules, read-only elsewhere.', system: true, org: ['reports.view'], modules: { default: ['view', 'export'], categories: { fin: ALL } } },
  { key: 'hr', name: 'HR', description: 'Full access to people modules (employees, HR, payroll, recruitment), read elsewhere.', system: true, org: ['reports.view'], modules: { default: ['view'], categories: {} } },
  { key: 'staff', name: 'Staff', description: 'Adds and edits records; cannot delete or export.', system: true, org: [], modules: { default: ['view', 'create', 'edit'] } },
  { key: 'teacher', name: 'Teacher', description: 'Works in Education modules.', system: true, org: [], modules: { default: [], categories: { edu: ['view', 'create', 'edit', 'export'] } } },
  { key: 'student', name: 'Student', description: 'Portal role: sees and adds only their own Education records.', system: true, org: [], modules: { default: [], categories: { edu: ['view', 'create'] } }, ownOnly: true },
  { key: 'patient', name: 'Patient', description: 'Portal role: sees and adds only their own Healthcare records.', system: true, org: [], modules: { default: [], categories: { health: ['view', 'create'] } }, ownOnly: true },
  { key: 'vendor', name: 'Vendor', description: 'Portal role: sees and adds only their own Retail and supply records.', system: true, org: [], modules: { default: [], categories: { retail: ['view', 'create'], mfg: ['view'] } }, ownOnly: true },
  { key: 'customer', name: 'Customer', description: 'Portal role: sees and adds only their own records in modules an admin opens to customers.', system: true, org: [], modules: { default: [] }, ownOnly: true },
];
// HR gets full access to these specific modules regardless of category.
export const HR_MODULES = ['employee', 'hr', 'payroll', 'salary', 'recruitment', 'attendance', 'team', 'jobportal'];
export const SYSTEM_ROLE_KEYS = SYSTEM_ROLES.map((r) => r.key);
export const ASSIGNABLE_BY_ADMIN = SYSTEM_ROLE_KEYS.filter((k) => k !== 'owner');

export function roleSpec(key: string, custom: RoleSpec[] = []): RoleSpec | undefined {
  return SYSTEM_ROLES.find((r) => r.key === key) || custom.find((r) => r.key === key);
}

/** Module overrides an org admin set on one module: { roleKey: actions[] }. */
export type ModulePerms = Record<string, ModuleAction[]>;

export function moduleActions(role: RoleSpec, moduleKey: string, overrides?: ModulePerms | null): ModuleAction[] {
  if (role.key === 'owner') return ALL; // owners can never lock themselves out
  if (overrides && Array.isArray(overrides[role.key])) return overrides[role.key].filter((a) => (MODULE_ACTIONS as readonly string[]).includes(a));
  const m = getModule(moduleKey); if (!m) return [];
  if (role.key === 'hr' && HR_MODULES.includes(moduleKey)) return ALL;
  const byCat = role.modules.categories?.[m.category];
  return byCat ?? role.modules.default;
}
export function canModule(role: RoleSpec, moduleKey: string, action: ModuleAction, overrides?: ModulePerms | null) {
  return moduleActions(role, moduleKey, overrides).includes(action);
}
export function canOrg(role: RoleSpec, perm: OrgPerm) { return role.org.includes(perm); }

export function validateRoleSpec(x: any): { ok: true; spec: Omit<RoleSpec, 'key' | 'system'> } | { ok: false; error: string } {
  if (!x || typeof x !== 'object') return { ok: false, error: 'role_invalid' };
  const name = typeof x.name === 'string' ? x.name.trim() : '';
  if (name.length < 2 || name.length > 40) return { ok: false, error: 'role_name_invalid' };
  const description = typeof x.description === 'string' ? x.description.trim().slice(0, 160) : '';
  const org = Array.isArray(x.org) ? x.org.filter((p: any) => (ORG_PERMS as readonly string[]).includes(p)) : [];
  const def = Array.isArray(x.modules?.default) ? x.modules.default.filter((a: any) => (MODULE_ACTIONS as readonly string[]).includes(a)) : [];
  const categories: Record<string, ModuleAction[]> = {};
  if (x.modules?.categories && typeof x.modules.categories === 'object') {
    for (const [k, v] of Object.entries(x.modules.categories)) {
      if (!/^[a-z]{2,12}$/.test(k) || !Array.isArray(v)) continue;
      categories[k] = (v as any[]).filter((a) => (MODULE_ACTIONS as readonly string[]).includes(a));
    }
  }
  if (org.includes('roles.manage') || org.includes('members.manage')) {
    // a custom role may manage members/roles, but only admins/owners can hand that out (checked in the API)
  }
  return { ok: true, spec: { name, description, org, modules: { default: def, categories }, ownOnly: !!x.ownOnly } };
}
